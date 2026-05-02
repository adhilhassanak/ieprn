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

import {
  Loader2,
  Upload,
  CheckCircle2,
} from "lucide-react";

const PHOTO_MAX = 500 * 1024; // 500 KB

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),

  gmail: z
    .string()
    .trim()
    .email()
    .max(255)
    .refine(
      (v) => v.endsWith("@gmail.com"),
      "Must be a @gmail.com address"
    ),

  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Phone must be 10 digits"),

  semester: z.string().trim().min(1).max(20),
  branch: z.string().trim().min(1).max(50),
  division: z.string().trim().min(1).max(20),

  current_position: z.string().trim().min(2).max(100),

  previous_position: z
    .string()
    .trim()
    .max(100)
    .optional()
    .or(z.literal("")),
});

const Register = () => {
  const { community: ckey } = useParams();
  const community = getCommunity(ckey);

  const navigate = useNavigate();
  const { user } = useAuth();

  const fileRef = useRef<HTMLInputElement>(null);

  const [positions, setPositions] = useState<
    {
      id: string;
      role_name: string;
      description: string | null;
      max_count: number;
      approved_count: number;
    }[]
  >([]);

  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [savedPhotoUrl, setSavedPhotoUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    gmail: "",
    phone: "",
    semester: "",
    branch: "",
    division: "",
    current_position: "",
    previous_position: "",
  });

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!community || !user) return;

    const loadData = async () => {
      // Check global community-open toggle
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("registration_open_global, community_registration")
        .limit(1)
        .maybeSingle();
      const cmap = (settings?.community_registration as Record<string, boolean> | null) ?? {};
      const isOpen =
        (settings?.registration_open_global ?? true) &&
        (cmap[community.short] ?? true);
      if (!isOpen) {
        setRegistrationClosed(true);
        return;
      }

      // Load positions with seat counts
      const { data: positionData } = await supabase
        .from("positions_needed")
        .select("id, role_name, description, max_count")
        .eq("community", community.short)
        .eq("is_active", true)
        .order("role_name");

      const withCounts = await Promise.all(
        (positionData ?? []).map(async (p: any) => {
          const { count } = await supabase
            .from("registrations")
            .select("id", { count: "exact", head: true })
            .eq("community", community.short)
            .eq("current_position", p.role_name)
            .eq("status", "approved");
          return { ...p, approved_count: count ?? 0 };
        })
      );
      setPositions(withCounts);

      // Saved photo (reuse across registrations)
      const { data: prof } = await supabase
        .from("profiles")
        .select("photo_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (prof?.photo_url) {
        setSavedPhotoUrl(prof.photo_url);
        setPhotoPreview(prof.photo_url);
      }

      // Prevent duplicate registration ONLY in same community
      const { data: existing } = await supabase
        .from("registrations")
        .select("id")
        .eq("user_id", user.id)
        .eq("community", community.short)
        .limit(1);

      if (existing && existing.length > 0) {
        setAlreadyApplied(true);
      }
    };

    loadData();
  }, [community, user]);

  if (!community) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold">
            Community not found
          </h1>

          <Button
            onClick={() => navigate("/dashboard")}
            className="mt-4"
          >
            Go to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  if (alreadyApplied) {
    return (
      <Layout>
        <div className="container py-20">
          <div className="glass-strong max-w-lg mx-auto rounded-2xl p-10 text-center">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />

            <h1 className="mt-4 text-2xl font-bold">
              Already Registered
            </h1>

            <p className="mt-2 text-muted-foreground">
              You have already applied for{" "}
              <strong>{community.short}</strong> ExeCom.
              Multiple registrations in the same community
              are not allowed.
            </p>

            <Button
              onClick={() => navigate("/dashboard")}
              className="mt-6 bg-gradient-emerald text-primary-foreground"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const set = (
    key: keyof typeof form,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const onPhoto = (file: File | null) => {
    if (!file) return;

    if (file.size > PHOTO_MAX) {
      toast({
        title: "Photo too large",
        description: "Maximum size is 500 KB",
        variant: "destructive",
      });
      return;
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!agree) {
      toast({
        title: "Please accept declaration",
        variant: "destructive",
      });
      return;
    }

    if (!photo) {
      toast({
        title: "Please upload your photo",
        variant: "destructive",
      });
      return;
    }

    const parsed = schema.safeParse(form);

    if (!parsed.success) {
      toast({
        title: "Check your inputs",
        description: parsed.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: existing } = await supabase
        .from("registrations")
        .select("id")
        .eq("user_id", user.id)
        .eq("community", community.short)
        .limit(1);

      if (existing && existing.length > 0) {
        toast({
          title: "Already Applied",
          description:
            "You already registered for this community.",
          variant: "destructive",
        });

        setLoading(false);
        return;
      }

      const ext =
        photo.name.split(".").pop() || "jpg";

      const path = `${user.id}/${community.key}-${Date.now()}.${ext}`;

      const { error: uploadError } =
        await supabase.storage
          .from("profile-photos")
          .upload(path, photo, {
            upsert: false,
          });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(path);

      const payload: any = {
        user_id: user.id,
        community: community.short,
        ...parsed.data,
        previous_position:
          parsed.data.previous_position || null,
        photo_url: publicUrl,
      };

      const { error: insertError } =
        await supabase
          .from("registrations")
          .insert(payload);

      if (insertError) throw insertError;

      setDone(true);
    } catch (err: any) {
      toast({
        title: "Submission failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Layout>
        <div className="container py-20">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-strong max-w-lg mx-auto rounded-2xl p-10 text-center shadow-glow-emerald"
          >
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />

            <h1 className="mt-4 text-2xl font-bold">
              Application Submitted!
            </h1>

            <p className="mt-2 text-muted-foreground">
              Your {community.short} ExeCom application
              is pending admin approval.
            </p>

            <Button
              onClick={() => navigate("/dashboard")}
              className="mt-6 bg-gradient-emerald text-primary-foreground"
            >
              Go to Dashboard
            </Button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-10 max-w-3xl">
        <BackButton />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-xs uppercase tracking-widest text-gold">
            Apply to ExeCom · 2026–27
          </div>

          <h1 className="mt-1 text-3xl md:text-4xl font-bold">
            {community.name}
          </h1>

          <p className="text-muted-foreground mt-2">
            {community.tagline}
          </p>
        </motion.div>

        <form
          onSubmit={submit}
          className="mt-8 glass-strong rounded-2xl p-6 md:p-8 space-y-5"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Full name</Label>
              <Input
                value={form.full_name}
                onChange={(e) =>
                  set("full_name", e.target.value)
                }
                required
              />
            </div>

            <div>
              <Label>Gmail</Label>
              <Input
                type="email"
                value={form.gmail}
                onChange={(e) =>
                  set("gmail", e.target.value)
                }
                required
              />
            </div>

            <div>
              <Label>Phone (10 digits)</Label>
              <Input
                inputMode="numeric"
                maxLength={10}
                value={form.phone}
                onChange={(e) =>
                  set("phone", e.target.value)
                }
                required
              />
            </div>

            <div>
              <Label>Branch</Label>
              <Input
                value={form.branch}
                onChange={(e) =>
                  set("branch", e.target.value)
                }
                required
              />
            </div>

            <div>
              <Label>Semester</Label>
              <Input
                value={form.semester}
                onChange={(e) =>
                  set("semester", e.target.value)
                }
                required
              />
            </div>

            <div>
              <Label>Division</Label>
              <Input
                value={form.division}
                onChange={(e) =>
                  set("division", e.target.value)
                }
                required
              />
            </div>

            <div>
              <Label>Position applying for</Label>

              {positions.length > 0 ? (
                <Select
                  value={form.current_position}
                  onValueChange={(v) =>
                    set("current_position", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a position" />
                  </SelectTrigger>

                  <SelectContent>
                    {positions.map((p) => (
                      <SelectItem
                        key={p.id}
                        value={p.role_name}
                      >
                        {p.role_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.current_position}
                  onChange={(e) =>
                    set(
                      "current_position",
                      e.target.value
                    )
                  }
                  placeholder="Type your desired position"
                  required
                />
              )}
            </div>
          </div>

          <div>
            <Label>Previous role (optional)</Label>
            <Input
              value={form.previous_position}
              onChange={(e) =>
                set(
                  "previous_position",
                  e.target.value
                )
              }
              placeholder="Optional"
            />
          </div>

          <div>
            <Label>Profile photo (max 500 KB)</Label>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                onPhoto(
                  e.target.files?.[0] ?? null
                )
              }
            />

            <button
              type="button"
              onClick={() =>
                fileRef.current?.click()
              }
              className="mt-2 w-full glass rounded-xl p-6 border-2 border-dashed border-border hover:border-primary/60"
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="preview"
                  className="h-20 w-20 rounded-lg object-cover mx-auto"
                />
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Upload className="h-5 w-5" />
                  Click to upload
                </div>
              )}
            </button>
          </div>

          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <Checkbox
              checked={agree}
              onCheckedChange={(v) =>
                setAgree(!!v)
              }
              className="mt-0.5"
            />

            <span>
              I declare that the above information is
              accurate and I commit to actively serving
              in the {community.short} ExeCom if selected.
            </span>
          </label>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-emerald text-primary-foreground"
          >
            {loading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Submit Application
          </Button>
        </form>
      </div>
    </Layout>
  );
};

export default Register;
