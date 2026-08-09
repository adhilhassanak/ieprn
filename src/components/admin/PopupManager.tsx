import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Save, X, MessageSquare, Upload } from "lucide-react";
import { COMMUNITY_LIST } from "@/lib/communities";

type Popup = {
  id: string;
  title: string;
  message: string | null;
  media_url: string | null;
  media_type: string;
  visible_to: string[];
  active: boolean;
  created_at: string;
};

const EMPTY = {
  title: "",
  message: "",
  media_url: "",
  media_type: "none",
  visible_to: [] as string[],
  active: true,
};

const detectType = (name: string) => {
  const n = name.toLowerCase();
  if (/\.(png|jpe?g|webp|gif|svg)$/.test(n)) return "image";
  if (n.endsWith(".pdf")) return "pdf";
  if (/\.(xlsx|xls|csv)$/.test(n)) return "excel";
  return "link";
};

export const PopupManager = () => {
  const [items, setItems] = useState<Popup[]>([]);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("community_popups")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Popup[]);
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setForm(EMPTY);
    setEditingId(null);
  };

  const upload = async (file: File) => {
    setUploading(true);
    const path = `popups/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const { error } = await supabase.storage.from("event-pdfs").upload(path, file, { upsert: true });
    setUploading(false);
    if (error) return toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    const { data } = supabase.storage.from("event-pdfs").getPublicUrl(path);
    setForm((f) => ({ ...f, media_url: data.publicUrl, media_type: detectType(file.name) }));
    toast({ title: "File uploaded" });
  };

  const submit = async () => {
    if (!form.title.trim()) return toast({ title: "Title is required", variant: "destructive" });
    if (form.visible_to.length === 0)
      return toast({ title: "Select at least one community", variant: "destructive" });

    const payload = {
      title: form.title.trim(),
      message: form.message || null,
      media_url: form.media_url || null,
      media_type: form.media_url ? form.media_type : "none",
      visible_to: form.visible_to,
      active: form.active,
    };

    const { error } = editingId
      ? await (supabase as any).from("community_popups").update(payload).eq("id", editingId)
      : await (supabase as any).from("community_popups").insert(payload);

    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: editingId ? "Popup updated" : "Popup created" });
    reset();
    load();
  };

  const edit = (p: Popup) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      message: p.message || "",
      media_url: p.media_url || "",
      media_type: p.media_type || "none",
      visible_to: p.visible_to ?? [],
      active: p.active,
    });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this popup?")) return;
    const { error } = await (supabase as any).from("community_popups").delete().eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    load();
  };

  const toggleActive = async (p: Popup) => {
    await (supabase as any).from("community_popups").update({ active: !p.active }).eq("id", p.id);
    load();
  };

  const toggleCommunity = (short: string) =>
    setForm((f) => ({
      ...f,
      visible_to: f.visible_to.includes(short)
        ? f.visible_to.filter((c) => c !== short)
        : [...f.visible_to, short],
    }));

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">{editingId ? "Edit popup message" : "Add popup message"}</h3>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Attachment (image / PDF / Excel)</Label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept="image/*,.pdf,.xlsx,.xls,.csv"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
              />
              {uploading && <Upload className="h-4 w-4 animate-pulse self-center text-primary" />}
            </div>
            {form.media_url && (
              <a
                href={form.media_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-primary underline mt-1 inline-block"
              >
                {form.media_type} attached — preview
              </a>
            )}
          </div>
        </div>

        <div>
          <Label>Message</Label>
          <Textarea
            rows={3}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Shown to approved ExeCom members of selected communities when they open the site."
          />
        </div>

        <div>
          <Label className="mb-2 block">Show to communities</Label>
          <div className="flex flex-wrap gap-2">
            {COMMUNITY_LIST.map((c) => {
              const on = form.visible_to.includes(c.short);
              return (
                <button
                  type="button"
                  key={c.key}
                  onClick={() => toggleCommunity(c.short)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-smooth ${
                    on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/60"
                  }`}
                >
                  {c.short}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Only approved ExeCom members of the selected communities will see this popup.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          <span className="text-sm">Active</span>
        </div>

        <div className="flex gap-2">
          <Button onClick={submit} className="bg-gradient-emerald text-primary-foreground">
            {editingId ? <><Save className="h-4 w-4 mr-1" />Save</> : <><Plus className="h-4 w-4 mr-1" />Add</>}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={reset}><X className="h-4 w-4 mr-1" />Cancel</Button>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-semibold mb-3">Popup messages ({items.length})</h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No popups yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((p) => (
              <div key={p.id} className="border-t border-border/50 pt-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2 flex-wrap">
                    {p.title}
                    <Badge variant={p.active ? "default" : "secondary"} className="text-[10px]">
                      {p.active ? "Active" : "Inactive"}
                    </Badge>
                    {p.media_url && <Badge variant="outline" className="text-[10px]">{p.media_type}</Badge>}
                  </div>
                  {p.message && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.message}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(p.visible_to ?? []).map((v) => (
                      <Badge key={`${p.id}-${v}`} variant="secondary" className="text-[10px]">{v}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                  <Button size="icon" variant="ghost" onClick={() => edit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
