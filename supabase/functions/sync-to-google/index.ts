// Proxies all calls to a Google Apps Script Web App that mirrors data into
// Google Sheets + Google Drive and returns Drive storage stats.
//
// Required secret: GOOGLE_APPS_SCRIPT_URL  (set in Lovable Cloud → Edge Functions)
//
// Supported actions (sent in body.action):
//   - "sync_registration"  → append a row to the Registrations sheet
//   - "sync_gallery"       → mirror an image to Drive + log it in the Gallery sheet
//   - "drive_stats"        → return { used, total, remaining, fileCount }
//   - "recent_uploads"     → return [{ name, url, size, mimeType, createdAt }]
//
// The matching Apps Script (doPost) lives in the project docs / chat.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("GOOGLE_APPS_SCRIPT_URL");
    if (!url) {
      console.error("GOOGLE_APPS_SCRIPT_URL is not set");
      return json(
        {
          ok: false,
          error: "GOOGLE_APPS_SCRIPT_URL not configured on the server",
        },
        500,
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const action =
      typeof body.action === "string" && body.action.length > 0
        ? body.action
        : typeof body.type === "string"
        ? body.type === "registration"
          ? "sync_registration"
          : body.type === "gallery"
          ? "sync_gallery"
          : (body.type as string)
        : "sync_registration";

    const payload = {
      action,
      timestamp: new Date().toISOString(),
      ...body,
    };

    console.log(`[sync-to-google] → ${action}`, {
      keys: Object.keys(body),
    });

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    const text = await upstream.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      // Apps Script can return plain text; keep as string
    }

    if (!upstream.ok) {
      console.error(
        `[sync-to-google] upstream ${upstream.status}: ${text.slice(0, 300)}`,
      );
      return json(
        {
          ok: false,
          error: `Google script returned ${upstream.status}`,
          upstream: data,
        },
        502,
      );
    }

    console.log(`[sync-to-google] ✓ ${action} ok`);
    return json({ ok: true, action, data });
  } catch (e) {
    const message = (e as Error).message ?? "Unknown error";
    console.error("[sync-to-google] error:", message);
    return json({ ok: false, error: message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
