import { useState, FormEvent, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getCommunity } from "@/lib/communities";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  gmail: z.string().trim().email().max(255).refine((v) => v.endsWith("@gmail.com"), "Must be a @gmail.com address"),
  phone: z.string().trim().regex(/^\d{10}$/, "Phone must be 10 digits"),
  current_semester: z.string().trim().min(1).max(20),
  next_semester: z.string().trim().min(1).max(20),
  branch: z.string().trim().min(1).max(50),
  division: z.string().trim().min(1).max(20),
  current_position: z.string().trim().min(2).max(100),
  previous_position: z.string().trim().max(100).optional().or(z.literal("")),
});

const Register = () => {
  const { community: ckey } = useParams();
  const community = getCommunity(ckey);
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    full_name: "",
    gmail: "",
    phone: "",
    current_semester: "",
    next_semester: "",
    branch: "",
    division: "",
    current_position: "",
    previous_position: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!community) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold">Community not found</h1>
          <Button onClick={() => navigate("/")} className="mt-4">Go home</Button>
        </div>
      </Layout>
    );
  }

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const onPhoto = (f: File | null) => {
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 4 MB", variant: "destructive" });
      return;
    }
    setPhoto(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!agree) return toast({ title: "Please accept the declaration", variant: "destructive" });
    if (!photo) return toast({ title: "Please upload your photo", variant: "destructive" });

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Check your inputs", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const ext = photo.name.split(".").pop() || "jpg";
      const path = `${user.id}/${community.key}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("profile-photos").upload(path, photo, { upsert: false });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("profile-photos").getPublicUrl(path);

      const regPayload: any = {
        user_id: user.id,
        community: community.short,
        ...parsed.data,
        previous_position: parsed.data.previous_position || null,
        photo_url: publicUrl,
      };
      const { error: insErr } = await supabase.from("registrations").insert(regPayload);
      if (insErr) throw insErr;

      // Save community on profile so co-admins can find them
      await supabase.from("profiles").update({ community: community.short }).eq("user_id", user.id);

      // Fire-and-forget Sheets/Drive sync
      supabase.functions.invoke("sync-to-google", {
        body: {
          type: "registration",
          community_name: community.short,
          ...parsed.data,
          photo_url: publicUrl,
        },
      }).catch(() => {});

      setDone(true);
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Layout>
        <div className="container py-20">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-strong max-w-lg mx-auto rounded-2xl p-10 text-center shadow-glow-emerald">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
            <h1 className="mt-4 text-2xl font-bold">Application submitted!</h1>
            <p className="mt-2 text-muted-foreground">Your {community.short} ExeCom application is now pending admin approval.</p>
            <Button onClick={() => navigate("/dashboard")} className="mt-6 bg-gradient-emerald text-primary-foreground">Go to dashboard</Button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-10 max-w-3xl">
        <BackButton />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-xs uppercase tracking-widest text-gold">Apply to ExeCom · 2026–27</div>
          <h1 className="mt-1 text-3xl md:text-4xl font-bold">{community.name}</h1>
          <p className="text-muted-foreground mt-2">{community.tagline}</p>
        </motion.div>

        <form onSubmit={submit} className="mt-8 glass-strong rounded-2xl p-6 md:p-8 space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required /></div>
            <div><Label>Gmail</Label><Input type="email" value={form.gmail} onChange={(e) => set("gmail", e.target.value)} required /></div>
            <div><Label>Phone (10 digits)</Label><Input inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => set("phone", e.target.value)} required /></div>
            <div><Label>Branch</Label><Input value={form.branch} onChange={(e) => set("branch", e.target.value)} required /></div>
            <div><Label>Current semester</Label><Input value={form.current_semester} onChange={(e) => set("current_semester", e.target.value)} required /></div>
            <div><Label>Next semester</Label><Input value={form.next_semester} onChange={(e) => set("next_semester", e.target.value)} required /></div>
            <div><Label>Division</Label><Input value={form.division} onChange={(e) => set("division", e.target.value)} required /></div>
            <div><Label>Position applying for (2026–27)</Label><Input value={form.current_position} onChange={(e) => set("current_position", e.target.value)} required /></div>
          </div>

          <div>
            <Label>Previous role in 2025–26 ExeCom (optional)</Label>
            <Input placeholder="e.g. Joint Secretary, or leave blank" value={form.previous_position} onChange={(e) => set("previous_position", e.target.value)} />
          </div>

          <div>
            <Label>Profile photo</Label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 w-full glass rounded-xl p-6 border-2 border-dashed border-border hover:border-primary/60 transition-smooth flex items-center justify-center gap-3 text-sm text-muted-foreground">
              {photoPreview ? (
                <img src={photoPreview} alt="preview" className="h-20 w-20 rounded-lg object-cover" />
              ) : (
                <><Upload className="h-5 w-5" /> Click to upload (max 4 MB)</>
              )}
            </button>
          </div>

          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
            <span>I declare that the above information is accurate and I commit to actively serving in the {community.short} ExeCom if selected.</span>
          </label>

          <Button type="submit" disabled={loading} className="w-full bg-gradient-emerald text-primary-foreground shadow-glow-emerald">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit application
          </Button>
        </form>
      </div>
    </Layout>
  );
};

export default Register;
