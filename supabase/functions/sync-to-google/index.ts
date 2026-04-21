// Mirrors registrations & event participants to a Google Sheets/Drive Apps Script webhook.
// Set the secret GOOGLE_APPS_SCRIPT_URL in Lovable Cloud → Edge Functions to enable.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("GOOGLE_APPS_SCRIPT_URL");
    if (!url) {
      return new Response(JSON.stringify({ ok: false, skipped: true, reason: "GOOGLE_APPS_SCRIPT_URL not set" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, timestamp: new Date().toISOString() }),
    });

    const text = await resp.text();
    return new Response(JSON.stringify({ ok: resp.ok, upstream: text.slice(0, 500) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
