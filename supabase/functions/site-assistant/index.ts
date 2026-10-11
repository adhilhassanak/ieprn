import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createOpenAI } from "npm:@ai-sdk/openai";
import { streamText } from "npm:ai";
import { z } from "npm:zod";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "../_shared/run-id.ts";

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20000) })).min(1).max(40),
  page: z.string().max(200).optional().default("/"),
});

const BASE = `You are the friendly AI assistant of IEprn — the I&E (Innovation & Entrepreneurship) website of College of Engineering Perumon, covering communities like IIC, E-Cell, ED Club, R&D Club and others.
Help users use the website: signing in, ExeCom registration (Dashboard → Apply for a community), creating events (Dashboard → Create New Event, pick 1-2 coordinators from any community), managing events, registering for events, CEP tasks, profile & password updates, past events and gallery.
You also help ExeCom members write formal REQUESTS (permission letters, venue/room requests, fund requests, OD/attendance requests, sponsorship letters, circulars, notices).
When writing a request, ask briefly for any missing key details (to whom, event, date, venue, purpose) if truly needed, otherwise draft it directly.
Wrap every finished request document between the lines <<<REQUEST and REQUEST>>> so the user can download it as a PDF. Inside, use plain text with line breaks (From, To, Date, Subject, salutation, body, closing, signature). No markdown inside the request.
Keep normal answers short and clear. Use simple language.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Invalid request" }, 400);
  const { messages, page } = parsed.data;

  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  let signedIn = false;
  let training = "";
  const token = auth.replace("Bearer ", "");
  if (token) {
    const { data: u } = await sb.auth.getUser(token);
    if (u?.user) {
      signedIn = true;
      const { data: s } = await sb.from("ai_assistant_settings").select("instructions, request_templates").eq("id", 1).maybeSingle();
      if (s?.instructions) training += `\n\nADMIN INSTRUCTIONS (follow these):\n${s.instructions}`;
      if (s?.request_templates) training += `\n\nREQUEST TEMPLATES / EXAMPLES from admin (match this format and style):\n${s.request_templates}`;
    }
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI is not configured" }, 500);
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  // Share public, published event info so the assistant can answer about events.
  const { data: evs } = await sb.from("events").select("name, community, event_date, venue, slug, registration_open")
    .in("status", ["published"]).order("event_date", { ascending: true }).limit(30);
  const eventsCtx = (evs ?? []).map((e: any) => `- ${e.name} (${e.community}) ${e.event_date ?? ""} ${e.venue ?? ""} · ${e.registration_open ? "registration open" : "registration closed"} · /events/${e.slug}`).join("\n");

  let streamError: any = null;
  try {
    const result = streamText({
      onError: ({ error }) => { streamError = error; },
      model: provider.responses("openai/gpt-6-astra"),
      system: `${BASE}\n\nUser is ${signedIn ? "signed in" : "not signed in"} and is on page ${page}.\n\nCURRENT PUBLISHED EVENTS:\n${eventsCtx || "none"}${training}`,
      messages,
      abortSignal: req.signal,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    let reply = "";
    try { reply = (await result.text).trim(); } catch (e) { streamError = streamError ?? e; }
    if (streamError) throw streamError;
    if (!reply) return json({ error: "The assistant could not answer that. Please try asking differently." }, 502);
    return json({ reply });
  } catch (e: any) {
    const status = e?.statusCode ?? e?.status ?? e?.cause?.statusCode ?? 500;
    const msg = status === 402 ? "The website's AI credits have run out. The admin needs to add AI credits in the workspace billing settings, then the assistant will work again."
      : status === 429 ? "Too many requests, please wait a moment and try again."
      : e?.message ?? "AI failed";
    // Handled AI errors return 200 with an error message so the app shows it in the chat instead of crashing.
    return json({ error: msg, status });
  }
});
