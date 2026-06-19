import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useFaculty, type Faculty } from "@/hooks/useFaculty";
import { Plus, Trash2, Save, UserCircle2, Upload } from "lucide-react";

const empty: Partial<Faculty> = { name: "", department: "", designation: "", email: "", phone: "", photo_url: "", priority: 100, active: true };

export const FacultyManager = () => {
  const { faculty, reload } = useFaculty(false);
  const [draft, setDraft] = useState<Partial<Faculty>>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `faculty/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return null; }
    const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const save = async () => {
    if (!draft.name?.trim()) return toast({ title: "Name required", variant: "destructive" });
    setBusy(true);
    const payload = {
      name: draft.name!.trim(),
      department: draft.department || null,
      designation: draft.designation || null,
      email: draft.email || null,
      phone: draft.phone || null,
      photo_url: draft.photo_url || null,
      priority: Number(draft.priority ?? 100),
      active: draft.active ?? true,
    };
    const { error } = editId
      ? await supabase.from("faculty").update(payload).eq("id", editId)
      : await supabase.from("faculty").insert(payload);
    setBusy(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: editId ? "Faculty updated" : "Faculty added" });
    setDraft(empty); setEditId(null); reload();
  };

  const edit = (f: Faculty) => { setEditId(f.id); setDraft(f); };
  const remove = async (id: string) => {
    if (!confirm("Delete this faculty entry?")) return;
    await supabase.from("faculty").delete().eq("id", id);
    reload();
  };
  const toggle = async (f: Faculty) => {
    await supabase.from("faculty").update({ active: !f.active }).eq("id", f.id);
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-5 space-y-4">
        <h3 className="font-semibold">{editId ? "Edit faculty" : "Add new faculty"}</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Name *</Label><Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div><Label>Designation</Label><Input placeholder="e.g. Faculty Lead, Asst. Professor" value={draft.designation ?? ""} onChange={(e) => setDraft({ ...draft, designation: e.target.value })} /></div>
          <div><Label>Department</Label><Input value={draft.department ?? ""} onChange={(e) => setDraft({ ...draft, department: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
          <div><Label>Priority order (lower = first)</Label><Input type="number" value={draft.priority ?? 100} onChange={(e) => setDraft({ ...draft, priority: parseInt(e.target.value || "100", 10) })} /></div>
          <div className="md:col-span-2">
            <Label>Profile photo</Label>
            <div className="flex items-center gap-3 mt-1">
              {draft.photo_url ? <img src={draft.photo_url} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <div className="h-14 w-14 rounded-lg bg-secondary grid place-items-center"><UserCircle2 className="h-7 w-7 text-muted-foreground" /></div>}
              <label className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md cursor-pointer text-sm hover:border-primary">
                <Upload className="h-4 w-4" /> Upload
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const url = await uploadPhoto(f);
                  if (url) setDraft((d) => ({ ...d, photo_url: url }));
                }} />
              </label>
              <Input className="flex-1" placeholder="or paste URL" value={draft.photo_url ?? ""} onChange={(e) => setDraft({ ...draft, photo_url: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-3 md:col-span-2">
            <Switch checked={draft.active ?? true} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
            <span className="text-sm">Active (visible on public pages)</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={busy} className="bg-gradient-emerald text-primary-foreground"><Save className="h-4 w-4 mr-1" />{editId ? "Update" : "Add"}</Button>
          {editId && <Button variant="outline" onClick={() => { setEditId(null); setDraft(empty); }}>Cancel</Button>}
        </div>
      </div>

      <div className="grid gap-3">
        {faculty.map((f) => (
          <div key={f.id} className="glass rounded-xl p-4 flex flex-wrap items-center gap-3">
            {f.photo_url ? <img src={f.photo_url} alt={f.name} className="h-14 w-14 rounded-lg object-cover" /> : <div className="h-14 w-14 rounded-lg bg-secondary grid place-items-center"><UserCircle2 className="h-7 w-7 text-muted-foreground" /></div>}
            <div className="flex-1 min-w-[200px]">
              <div className="font-medium">{f.name} {f.designation && <Badge variant="outline" className="ml-2 text-xs">{f.designation}</Badge>} {!f.active && <Badge variant="destructive" className="ml-1 text-xs">inactive</Badge>}</div>
              <div className="text-xs text-muted-foreground">{f.department ?? "—"} · {f.email ?? "—"} · {f.phone ?? "—"} · priority {f.priority}</div>
            </div>
            <Switch checked={f.active} onCheckedChange={() => toggle(f)} />
            <Button size="sm" variant="outline" onClick={() => edit(f)}>Edit</Button>
            <Button size="icon" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {faculty.length === 0 && <div className="text-center text-muted-foreground py-10">No faculty yet.</div>}
      </div>
    </div>
  );
};
