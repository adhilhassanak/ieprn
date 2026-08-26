import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Save, UserCircle2, KeyRound } from "lucide-react";

const PHOTO_MAX = 500 * 1024;


const Profile = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ full_name: "", email: "", phone: "", semester: "" });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (p) setProfile({ full_name: p.full_name ?? "", email: p.email ?? user.email ?? "", phone: p.phone ?? "", semester: p.semester ?? "" });
      const { data: r } = await supabase.from("registrations").select("photo_url").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (r?.photo_url) setPhotoUrl(r.photo_url);
    })();
  }, [user]);

  const onPhoto = (f: File | null) => {
    if (!f) return;
    if (f.size > PHOTO_MAX) return toast({ title: "Photo too large", description: "Max 500 KB", variant: "destructive" });
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let newPhotoUrl: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/profile-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("profile-photos").upload(path, photoFile);
        if (error) throw error;
        newPhotoUrl = supabase.storage.from("profile-photos").getPublicUrl(path).data.publicUrl;
        // Update ALL registrations photo for ExeCom directory across communities
        await supabase.from("registrations").update({ photo_url: newPhotoUrl }).eq("user_id", user.id);
        setPhotoUrl(newPhotoUrl);
      }

      const { error } = await supabase.from("profiles").update({
        full_name: profile.full_name,
        phone: profile.phone,
        semester: profile.semester,
        ...(newPhotoUrl ? { photo_url: newPhotoUrl } : {}),
      }).eq("user_id", user.id);
      // Propagate name/phone/semester to all registrations as well
      await supabase.from("registrations").update({
        full_name: profile.full_name,
        phone: profile.phone,
        semester: profile.semester,
      }).eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Profile updated" });
      setPhotoFile(null);
      setPhotoPreview("");
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container py-10 max-w-2xl">
        <BackButton />
        <h1 className="text-3xl md:text-4xl font-bold">Your <span className="text-gradient-emerald">profile</span></h1>

        <div className="mt-8 glass-strong rounded-2xl p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-4">
            {photoPreview || photoUrl ? (
              <img src={photoPreview || photoUrl!} alt="" className="h-20 w-20 rounded-xl object-cover" />
            ) : (
              <div className="h-20 w-20 rounded-xl bg-secondary grid place-items-center"><UserCircle2 className="h-10 w-10 text-muted-foreground" /></div>
            )}
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0] ?? null)} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" />Change photo (max 500 KB)
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Full name</Label><Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={profile.email} disabled /></div>
            <div><Label>Phone</Label><Input inputMode="numeric" maxLength={10} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
            <div><Label>Semester</Label><Input value={profile.semester} onChange={(e) => setProfile({ ...profile, semester: e.target.value })} /></div>
          </div>

          <Button onClick={save} disabled={loading} className="bg-gradient-emerald text-primary-foreground shadow-glow-emerald">
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save changes
          </Button>
        </div>

        <div className="mt-6 glass-strong rounded-2xl p-6 md:p-8 flex flex-wrap items-center gap-4 justify-between">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Password
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Change your account password on a dedicated page.
            </p>
          </div>
          <Button asChild className="bg-gradient-emerald text-primary-foreground shadow-glow-emerald">
            <Link to="/update-password">
              <KeyRound className="h-4 w-4 mr-1" />
              Update Password
            </Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
