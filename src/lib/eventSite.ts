import { supabase } from "@/integrations/supabase/client";

/** Event websites are stored as a single HTML file in existing file storage — no database tables. */
export const sitePath = (createdBy: string, eventId: string) => `${createdBy}/sites/${eventId}.html`;

export const siteUrl = (createdBy: string, eventId: string) =>
  supabase.storage.from("event-posters").getPublicUrl(sitePath(createdBy, eventId)).data.publicUrl;

export async function loadSiteHtml(createdBy: string, eventId: string): Promise<string | null> {
  try {
    const r = await fetch(`${siteUrl(createdBy, eventId)}?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

export async function saveSiteHtml(createdBy: string, eventId: string, html: string) {
  const blob = new Blob([html], { type: "text/html" });
  return supabase.storage.from("event-posters").upload(sitePath(createdBy, eventId), blob, {
    upsert: true,
    contentType: "text/html",
    cacheControl: "0",
  });
}

export async function deleteSite(createdBy: string, eventId: string) {
  return supabase.storage.from("event-posters").remove([sitePath(createdBy, eventId)]);
}
