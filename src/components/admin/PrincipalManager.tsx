import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { usePrincipal, type Principal } from "@/hooks/useFaculty";
import { Save, Upload, UserCircle2, Trash2 } from "lucide-react";

export const PrincipalManager = () => {
  const { principal, reload } = usePrincipal();
  const [draft, setDraft] = useState<Partial<Principal>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { setDraft(principal ?? {}); }, [principal]);

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `principal/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return null; }
    return supabase.storage.from("profile-photos").getPublicUrl(path).data.publicUrl;
  };

  const save = async () => {
    if (!draft.name?.trim()) return toast({ title: "Name required", variant: "destructive" });
    setBusy(true);
    const payload = {
      name: draft.name!.trim(),
      designation: draft.designation || null,
      email: draft.email || null,
      phone: draft.phone || null,
      photo_url: draft.photo_url || null,
    };
    const { error } = principal?.id
      ? await supabase.from("principal").update(payload).eq("id", principal.id)
      : await supabase.from("principal").insert(payload);
    setBusy(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Principal saved" });
    reload();
  };

  const remove = async () => {
    if (!principal?.id) return;
    if (!confirm("Remove the principal record?")) return;
    await supabase.from("principal").delete().eq("id", principal.id);
    setDraft({}); reload();
  };

  return (
    <div className="glass rounded-xl p-5 space-y-4 max-w-2xl">
      <h3 className="font-semibold">Principal</h3>
      <div className="grid md:grid-cols-2 gap-3">
        <div><Label>Name *</Label><Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
        <div><Label>Designation</Label><Input value={draft.designation ?? ""} onChange={(e) => setDraft({ ...draft, designation: e.target.value })} /></div>
        <div><Label>Email</Label><Input type="email" value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
        <div className="md:col-span-2">
          <Label>Photo</Label>
          <div className="flex items-center gap-3 mt-1">
            {draft.photo_url ? <img src={draft.photo_url} alt="" className="h-16 w-16 rounded-lg object-cover" /> : <div className="h-16 w-16 rounded-lg bg-secondary grid place-items-center"><UserCircle2 className="h-8 w-8 text-muted-foreground" /></div>}
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
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={busy} className="bg-gradient-emerald text-primary-foreground"><Save className="h-4 w-4 mr-1" />Save</Button>
        {principal?.id && <Button variant="outline" onClick={remove}><Trash2 className="h-4 w-4 mr-1" />Remove</Button>}
      </div>
    </div>
  );
};
