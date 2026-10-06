import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { loadSiteHtml, saveSiteHtml, deleteSite } from "@/lib/eventSite";
import { ExternalLink, Loader2, Save, Sparkles, Trash2, Wand2 } from "lucide-react";

const starter = (e: any, registerUrl: string) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${e.title ?? "Event"}</title>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#0b1220;color:#f1f5f9}
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem}
h1{font-size:clamp(2rem,6vw,4rem);margin:.5rem 0}
p{max-width:640px;opacity:.85;line-height:1.6}
a.btn{margin-top:1.5rem;background:#22c55e;color:#04120a;padding:.9rem 2rem;border-radius:999px;font-weight:700;text-decoration:none}
img{max-width:320px;width:100%;border-radius:16px;margin-bottom:1rem}
</style></head><body>
<section class="hero">
${e.poster_url ? `<img src="${e.poster_url}" alt="poster"/>` : ""}
<h1>${e.title ?? "Your Event"}</h1>
<p>${(e.description ?? "").slice(0, 400)}</p>
<p>${e.event_date ?? ""} ${e.venue ? "· " + e.venue : ""}</p>
<a class="btn" href="${registerUrl}" target="_top">Register now</a>
</section></body></html>`;

const IDEAS = [
  "Make a modern, colourful landing page with hero, about, schedule, prizes, FAQ and a big Register button",
  "Add a countdown timer to the event date",
  "Switch to a light, clean theme with green accents",
  "Add a coordinators contact section",
];

export default function EventWebsite() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [html, setHtml] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    (async () => {
      const isUuid = /^[0-9a-f-]{36}$/i.test(id ?? "");
      const { data } = await supabase.from("events").select("*").eq(isUuid ? "id" : "slug", id!).maybeSingle();
      if (!data) return;
      setEvent(data);
      const existing = await loadSiteHtml(data.created_by, data.id);
      setExists(!!existing);
      setHtml(existing ?? starter(data, `${window.location.origin}/events/${data.slug ?? data.id}`));
    })();
  }, [id]);

  if (!event) return <Layout><div className="container py-20 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin inline" /></div></Layout>;

  const canEdit = user && (user.id === event.created_by || isAdmin);
  const registerUrl = `${window.location.origin}/events/${event.slug ?? event.id}`;
  const publicUrl = `${window.location.origin}/site/${event.slug ?? event.id}`;

  const askAi = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("event-site-ai", {
      body: {
        prompt,
        currentHtml: html,
        event: {
          title: event.title, description: event.description, event_date: event.event_date, venue: event.venue,
          community: event.community, poster_url: event.poster_url, coordinators: event.coordinator_names,
          collaborators: event.collaborators, REGISTER_URL: registerUrl,
        },
      },
    });
    setBusy(false);
    let msg = (data as any)?.error;
    if (error && !msg) {
      try { msg = (await (error as any).context?.json())?.error; } catch { /* ignore */ }
      msg = msg ?? error.message;
    }
    if (msg) return toast({ title: "AI could not build the page", description: msg, variant: "destructive" });
    setHtml((data as any).html);
    setPrompt("");
    toast({ title: "Website updated", description: "Check the preview, then press Save & publish." });
  };

  const save = async () => {
    setSaving(true);
    const { error } = await saveSiteHtml(event.created_by, event.id, html);
    setSaving(false);
    if (error) return toast({ title: "Could not save", description: error.message, variant: "destructive" });
    setExists(true);
    toast({ title: "Website published", description: publicUrl });
  };

  const remove = async () => {
    if (!confirm("Delete this event website?")) return;
    await deleteSite(event.created_by, event.id);
    setExists(false);
    toast({ title: "Website deleted" });
  };

  return (
    <Layout>
      <div className="container py-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Event website builder</h1>
            <p className="text-sm text-muted-foreground">{event.title}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to={`/events/${event.slug ?? event.id}/manage`}>Back to manage</Link></Button>
            {exists && <Button asChild variant="outline" size="sm"><a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Open website</a></Button>}
            {canEdit && exists && <Button variant="destructive" size="sm" onClick={remove}><Trash2 className="h-4 w-4" /></Button>}
            {canEdit && <Button size="sm" onClick={save} disabled={saving} className="bg-gradient-emerald text-primary-foreground">{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}Save & publish</Button>}
          </div>
        </div>
        {!canEdit && <p className="text-sm text-destructive">Only the event creator or an admin can publish this website.</p>}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass rounded-2xl p-4">
            <Tabs defaultValue="ai">
              <TabsList className="mb-3">
                <TabsTrigger value="ai"><Sparkles className="h-4 w-4 mr-1" />Build with AI</TabsTrigger>
                <TabsTrigger value="code">Code</TabsTrigger>
              </TabsList>
              <TabsContent value="ai" className="space-y-3">
                <Textarea rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the website you want, or what to change…" />
                <div className="flex flex-wrap gap-2">
                  {IDEAS.map((i) => (
                    <button key={i} type="button" onClick={() => setPrompt(i)}
                      className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted text-left">{i}</button>
                  ))}
                </div>
                <Button onClick={askAi} disabled={busy || !prompt.trim()} className="w-full">
                  {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />AI is designing… (up to a minute)</> : <><Wand2 className="h-4 w-4 mr-2" />Generate / update with AI</>}
                </Button>
                <p className="text-xs text-muted-foreground">AI uses your event details and keeps editing the current page. Ask as many changes as you like, then Save & publish.</p>
              </TabsContent>
              <TabsContent value="code">
                <Textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={28} className="font-mono text-xs" spellCheck={false} />
              </TabsContent>
            </Tabs>
          </div>
          <div className="glass rounded-2xl overflow-hidden min-h-[600px]">
            <iframe title="preview" srcDoc={html} sandbox="allow-scripts allow-popups allow-forms" className="w-full h-full min-h-[600px] bg-background" />
          </div>
        </div>
      </div>
    </Layout>
  );
}
