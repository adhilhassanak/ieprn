import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { loadSiteHtml } from "@/lib/eventSite";
import { Loader2 } from "lucide-react";

export default function EventSite() {
  const { id } = useParams();
  const [html, setHtml] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const isUuid = /^[0-9a-f-]{36}$/i.test(id ?? "");
      const { data } = await supabase.from("events").select("id, created_by, name").eq(isUuid ? "id" : "slug", id!).maybeSingle();
      if (!data) return setHtml(null);
      document.title = data.name;
      setHtml(await loadSiteHtml(data.created_by, data.id));
    })();
  }, [id]);

  if (html === undefined) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (html === null) return (
    <div className="min-h-screen grid place-items-center text-center p-6">
      <div><p className="mb-3 text-muted-foreground">This event has no website yet.</p><Link className="text-primary underline" to={`/events/${id}`}>Go to event page</Link></div>
    </div>
  );
  return <iframe title="Event website" srcDoc={html} sandbox="allow-scripts allow-popups allow-forms allow-top-navigation-by-user-activation" className="fixed inset-0 w-full h-full border-0" />;
}
