import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createOpenAI } from "npm:@ai-sdk/openai";
import { streamText } from "npm:ai";
import { z } from "npm:zod";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "../_shared/run-id.ts";

const Body = z.object({
  prompt: z.string().min(1).max(4000),
  currentHtml: z.string().max(200000).optional().default(""),
  event: z.record(z.any()).optional().default({}),
});

const SYSTEM = `You are an expert web designer who builds beautiful, responsive single-page event registration websites.
Always reply with ONE complete HTML document only (starting with <!DOCTYPE html>), no markdown fences, no explanation.
Use inline <style> and optional inline <script>. You may use Google Fonts and Tailwind CDN. Make it mobile-friendly, modern and accessible.
Use the event details given. For any "Register" button, link to the REGISTER_URL provided. Use the poster image URL if provided.
If current HTML is provided, edit it according to the request and keep everything else the same.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Please sign in" }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: u } = await sb.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ error: "Please sign in" }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Invalid request" }, 400);
  const { prompt, currentHtml, event } = parsed.data;

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI is not configured" }, 500);

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const userMsg = `EVENT DETAILS (JSON):\n${JSON.stringify(event).slice(0, 8000)}\n\n` +
    (currentHtml ? `CURRENT HTML:\n${currentHtml}\n\n` : "") + `REQUEST:\n${prompt}`;

  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
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
    let html = (await result.text).trim();
    html = html.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "").trim();
    if (!html) return json({ error: "AI returned an empty page. Try again with a different request." }, 502);
    return json({ html });
  } catch (e: any) {
    const status = e?.statusCode ?? e?.status ?? 500;
    const msg = status === 402 ? "AI credits are used up. Please add credits to continue."
      : status === 429 ? "Too many requests, please wait a moment and try again."
      : e?.message ?? "AI failed";
    return json({ error: msg }, [400, 401, 402, 403, 429].includes(status) ? status : 500);
  }
});
