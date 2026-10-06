import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { COMMUNITY_LIST, BUILT_IN_KEYS } from "@/lib/communities";
import { Plus, Trash2 } from "lucide-react";

type Row = { key: string; name: string; short: string; tagline: string; accent: string; instagram: string | null; facebook: string | null; linkedin: string | null };
const empty = { key: "", name: "", short: "", tagline: "", accent: "emerald", instagram: "", facebook: "", linkedin: "" };

export function CommunitiesManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("custom_communities").select("*").order("created_at");
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    const key = form.key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!key || !form.name.trim() || !form.short.trim()) {
      return toast({ title: "Key, full name and short name are required", variant: "destructive" });
    }
    if (COMMUNITY_LIST.some((c) => c.key === key) && !rows.some((r) => r.key === key)) {
      return toast({ title: "That community already exists", variant: "destructive" });
    }
    setBusy(true);
    const { error } = await supabase.from("custom_communities").upsert({
      key, name: form.name.trim(), short: form.short.trim(), tagline: form.tagline.trim(), accent: form.accent,
      instagram: form.instagram || null, facebook: form.facebook || null, linkedin: form.linkedin || null,
    });
    setBusy(false);
    if (error) return toast({ title: "Could not save", description: error.message, variant: "destructive" });
    toast({ title: "Community saved", description: "Reload the page to see it everywhere." });
    setForm(empty);
    load();
  };

  const confirmDelete = (label: string) => {
    if (!confirm(`Warning 1 of 3: Delete the community "${label}"?`)) return false;
    if (!confirm(`Warning 2 of 3: "${label}" will disappear from the home page, menus, registration and event forms for everyone. Continue?`)) return false;
    const typed = prompt(`Final warning 3 of 3: type ${label} to permanently delete it.`);
    if ((typed ?? "").trim().toLowerCase() !== label.toLowerCase()) {
      toast({ title: "Deletion cancelled", description: "The name did not match." });
      return false;
    }
    return true;
  };

  const remove = async (key: string, label: string) => {
    if (!confirmDelete(label)) return;
    // Built-in communities are hidden with a "deleted" marker; custom ones are removed.
    const { error } = BUILT_IN_KEYS.includes(key)
      ? await supabase.from("custom_communities").upsert({ key, name: label, short: label, tagline: "", accent: "deleted" })
      : await supabase.from("custom_communities").delete().eq("key", key);
    if (error) return toast({ title: "Could not delete", description: error.message, variant: "destructive" });
    toast({ title: "Community deleted", description: "Reload the page to see the change everywhere. Existing events and members stay saved." });
    load();
  };

  const restore = async (key: string) => {
    const { error } = await supabase.from("custom_communities").delete().eq("key", key);
    if (error) return toast({ title: "Could not restore", description: error.message, variant: "destructive" });
    toast({ title: "Community restored", description: "Reload the page to see it again." });
    load();
  };

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5">
        <h3 className="font-semibold mb-4">Add a community</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Short key (used in links, e.g. "iedc")</Label><Input value={form.key} onChange={set("key")} /></div>
          <div><Label>Short name (e.g. "IEDC")</Label><Input value={form.short} onChange={set("short")} /></div>
          <div><Label>Full name</Label><Input value={form.name} onChange={set("name")} /></div>
          <div><Label>Tagline</Label><Input value={form.tagline} onChange={set("tagline")} /></div>
          <div>
            <Label>Colour</Label>
            <Select value={form.accent} onValueChange={(v) => setForm({ ...form, accent: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["emerald", "gold", "violet", "purple"].map((a) => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Instagram link</Label><Input value={form.instagram} onChange={set("instagram")} /></div>
          <div><Label>Facebook link</Label><Input value={form.facebook} onChange={set("facebook")} /></div>
          <div><Label>LinkedIn link</Label><Input value={form.linkedin} onChange={set("linkedin")} /></div>
        </div>
        <Button onClick={add} disabled={busy} className="mt-4 bg-gradient-emerald text-primary-foreground">
          <Plus className="h-4 w-4 mr-1" /> Save community
        </Button>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-semibold mb-3">All communities</h3>
        <div className="space-y-2">
          {COMMUNITY_LIST.filter((c) => !rows.some((r) => r.key === c.key)).map((c) => (
            <div key={c.key} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div><div className="font-medium">{c.short}</div><div className="text-xs text-muted-foreground">{c.name} · built-in</div></div>
              <Button size="sm" variant="destructive" onClick={() => remove(c.key, c.short)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {rows.filter((r) => r.accent === "deleted").map((r) => (
            <div key={r.key} className="flex items-center justify-between rounded-lg border border-dashed border-border p-3 opacity-70">
              <div><div className="font-medium line-through">{r.short}</div><div className="text-xs text-muted-foreground">deleted</div></div>
              <Button size="sm" variant="outline" onClick={() => restore(r.key)}>Restore</Button>
            </div>
          ))}
          {rows.filter((r) => r.accent !== "deleted").map((r) => (
            <div key={r.key} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div><div className="font-medium">{r.short}</div><div className="text-xs text-muted-foreground">{r.name} · /{r.key}</div></div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setForm({ ...empty, ...r, instagram: r.instagram ?? "", facebook: r.facebook ?? "", linkedin: r.linkedin ?? "" })}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => remove(r.key, r.short)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
