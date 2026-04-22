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
    }[]
  >([]);

  const [alreadyApplied, setAlreadyApplied] = useState(false);

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

  /*
    --------------------------------------------------
    LOAD POSITIONS + CHECK DUPLICATE REGISTRATION
    --------------------------------------------------
  */

  useEffect(() => {
    if (!community || !user) return;

    const loadData = async () => {
      // Positions
      const { data: positionData } = await supabase
        .from("positions_needed")
        .select("id, role_name, description")
        .eq("community", community.short)
        .eq("is_active", true)
        .order("role_name");

      setPositions(positionData ?? []);

      // IMPORTANT:
      // prevent multiple registration in SAME community
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

  /*
    --------------------------------------------------
    COMMUNITY NOT FOUND
    --------------------------------------------------
  */

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

  /*
    --------------------------------------------------
    ALREADY APPLIED BLOCK
    --------------------------------------------------
  */

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

  /*
    --------------------------------------------------
    HELPERS
    --------------------------------------------------
  */

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

  /*
    --------------------------------------------------
    SUBMIT
    --------------------------------------------------
  */

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
      /*
        SAFETY CHECK AGAIN BEFORE INSERT
      */

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

      /*
        PHOTO UPLOAD
      */

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

      /*
        INSERT REGISTRATION
      */

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

      /*
        UPDATE PROFILE
      */

      await supabase
        .from("profiles")
        .update({
          community: community.short,
        })
        .eq("user_id", user.id);

      /*
        OPTIONAL GOOGLE SYNC
      */

      supabase.functions
        .invoke("sync-to-google", {
          body: {
            type: "registration",
            community_name: community.short,
            ...parsed.data,
            photo_url: publicUrl,
          },
        })
        .catch(() => {});

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

  /*
    --------------------------------------------------
    SUCCESS SCREEN
    --------------------------------------------------
  */

  if (done) {
    return (
      <Layout>
        <div className="container py-20">
          <motion.div
            initial={{
              scale: 0.9,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
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

  /*
    --------------------------------------------------
    FORM UI
    --------------------------------------------------
  */

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
          {/* Your existing form UI continues exactly same */}
        </form>
      </div>
    </Layout>
  );
};

export default Register;
