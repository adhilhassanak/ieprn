import { useState, FormEvent, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getCommunity } from "@/lib/communities";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";

const PHOTO_MAX = 500 * 1024;

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  gmail: z
    .string()
    .trim()
    .email()
    .max(255)
    .refine((v) => v.endsWith("@gmail.com"), "Must be a @gmail.com address"),
  phone: z.string().regex(/^\d{10}$/),
  current_semester: z.string().min(1),
  next_semester: z.string().min(1),
  branch: z.string().min(1),
  division: z.string().min(1),
  current_position: z.string().min(2),
  previous_position: z.string().optional().or(z.literal("")),
});

const Register = () => {
  const { community: ckey } = useParams();
  const community = getCommunity(ckey);
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [positions, setPositions] = useState<any[]>([]);
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
  const [preview, setPreview] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!community) return;

    supabase
      .from("positions_needed")
      .select("id, role_name, description")
      .eq("community", community.short)
      .eq("is_active", true)
      .order("role_name")
      .then(({ data }) => setPositions(data || []));
  }, [community]);

  if (!community) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold">Community not found</h1>
        </div>
      </Layout>
    );
  }

  const set = (k: any, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handlePhoto = (f: File | null) => {
    if (!f) return;
    if (f.size > PHOTO_MAX)
      return toast({
        title: "Photo too large (max 500KB)",
        variant: "destructive",
      });

    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) return;
    if (!agree)
      return toast({ title: "Accept declaration", variant: "destructive" });
    if (!photo)
      return toast({ title: "Upload photo", variant: "destructive" });
    if (!form.current_position)
      return toast({ title: "Select position", variant: "destructive" });

    const parsed = schema.safeParse(form);
    if (!parsed.success)
      return toast({
        title: "Invalid input",
        description: parsed.error.issues[0].message,
        variant: "destructive",
      });

    setLoading(true);

    try {
      const ext = photo.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      await supabase.storage.from("profile-photos").upload(path, photo);

      const { data } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(path);

      await supabase.from("registrations").insert({
        user_id: user.id,
        community: community.short,
        ...parsed.data,
        photo_url: data.publicUrl,
      });

      setDone(true);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  if (done) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <CheckCircle2 className="mx-auto h-16 text-green-500" />
          <h1 className="text-2xl font-bold mt-4">
            Application Submitted!
          </h1>
          <Button onClick={() => navigate("/dashboard")} className="mt-6">
            Go Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-10 max-w-3xl">
        <BackButton />

        <h1 className="text-3xl font-bold">{community.name}</h1>

        <form onSubmit={submit} className="space-y-4 mt-6">
          <Input
            placeholder="Full Name"
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
          />

          <Input
            placeholder="Gmail"
            value={form.gmail}
            onChange={(e) => set("gmail", e.target.value)}
          />

          <Input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />

          <Input
            placeholder="Branch"
            value={form.branch}
            onChange={(e) => set("branch", e.target.value)}
          />

          <Input
            placeholder="Current Sem"
            value={form.current_semester}
            onChange={(e) => set("current_semester", e.target.value)}
          />

          <Input
            placeholder="Next Sem"
            value={form.next_semester}
            onChange={(e) => set("next_semester", e.target.value)}
          />

          <Input
            placeholder="Division"
            value={form.division}
            onChange={(e) => set("division", e.target.value)}
          />

          {/* ✅ POSITION DROPDOWN */}
          <div>
            <Label>Position</Label>
            <Select
              value={form.current_position}
              onValueChange={(v) => set("current_position", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Position" />
              </SelectTrigger>

              <SelectContent>
                {positions.length > 0 ? (
                  positions.map((p) => (
                    <SelectItem key={p.id} value={p.role_name}>
                      {p.role_name}
                      {p.description ? ` - ${p.description}` : ""}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem disabled value="none">
                    No positions available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <Input
            placeholder="Previous Position (optional)"
            value={form.previous_position}
            onChange={(e) => set("previous_position", e.target.value)}
          />

          {/* PHOTO */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="border p-4 w-full rounded"
          >
            {preview ? (
              <img src={preview} className="h-20 mx-auto" />
            ) : (
              "Upload Photo"
            )}
          </button>

          <input
            ref={fileRef}
            type="file"
            hidden
            onChange={(e) => handlePhoto(e.target.files?.[0] || null)}
          />

          <label className="flex gap-2 text-sm">
            <Checkbox
              checked={agree}
              onCheckedChange={(v) => setAgree(!!v)}
            />
            I agree
          </label>

          <Button disabled={loading} className="w-full">
            {loading && <Loader2 className="animate-spin mr-2" />}
            Submit
          </Button>
        </form>
      </div>
    </Layout>
  );
};

export default Register;
