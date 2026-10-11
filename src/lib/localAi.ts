import type { MLCEngineInterface, ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import { supabase } from "@/integrations/supabase/client";

/** On-device AI: the model runs inside the visitor's browser (WebGPU). No credits, no server calls for answers. */
export const LOCAL_MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

let enginePromise: Promise<MLCEngineInterface> | null = null;

export const deviceSupportsLocalAi = () => typeof navigator !== "undefined" && "gpu" in navigator;

export function getEngine(onProgress: (text: string, pct: number) => void) {
  if (!enginePromise) {
    enginePromise = import("@mlc-ai/web-llm")
      .then(({ CreateMLCEngine }) =>
        CreateMLCEngine(LOCAL_MODEL, { initProgressCallback: (p) => onProgress(p.text, p.progress) }),
      )
      .catch((e) => { enginePromise = null; throw e; });
  }
  return enginePromise;
}

const BASE = `You are the friendly AI assistant of IEprn — the I&E (Innovation & Entrepreneurship) website of College of Engineering Perumon, covering communities like IIC, E-Cell, ED Club, R&D Club and others.
Help users use the website: signing in, ExeCom registration (Dashboard → Apply for a community), creating events (Dashboard → Create New Event, pick 1-2 coordinators from any community), managing events, registering for events, CEP tasks, profile & password updates (Profile → Update Password), past events and gallery.
You also help ExeCom members write formal REQUESTS (permission letters, venue requests, fund requests, OD/attendance requests, sponsorship letters, notices).
When writing a request, draft it directly using placeholders like [Date] for unknown details.
Wrap every finished request letter between the lines <<<REQUEST and REQUEST>>> so the user can download it as a PDF. Inside, use plain text with line breaks (From, To, Date, Subject, salutation, body, closing, signature). No markdown inside the request.
Keep normal answers short and clear. Use simple language.`;

export async function buildSystemPrompt(page: string) {
  const [{ data: evs }, { data: s }] = await Promise.all([
    supabase.from("events").select("name, community, event_date, venue, slug, registration_open")
      .eq("status", "published").order("event_date", { ascending: true }).limit(20),
    supabase.from("ai_assistant_settings").select("instructions, request_templates").eq("id", 1).maybeSingle(),
  ]);
  const events = (evs ?? []).map((e: any) =>
    `- ${e.name} (${e.community}) ${e.event_date ?? ""} ${e.venue ?? ""} · ${e.registration_open ? "registration open" : "registration closed"} · /events/${e.slug}`).join("\n");
  let p = `${BASE}\n\nThe user is on page ${page}.\n\nCURRENT PUBLISHED EVENTS:\n${events || "none"}`;
  if (s?.instructions) p += `\n\nADMIN INSTRUCTIONS (follow these):\n${s.instructions.slice(0, 4000)}`;
  if (s?.request_templates) p += `\n\nSAMPLE REQUEST LETTERS (copy this style):\n${s.request_templates.slice(0, 4000)}`;
  return p;
}

export async function* chatLocal(engine: MLCEngineInterface, system: string, messages: ChatCompletionMessageParam[]) {
  const stream = await engine.chat.completions.create({
    messages: [{ role: "system", content: system }, ...messages],
    stream: true,
    temperature: 0.6,
  });
  for await (const chunk of stream) {
    const d = chunk.choices[0]?.delta?.content;
    if (d) yield d;
  }
}
