import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { KeyRound, Loader2 } from "lucide-react";

const UpdatePassword = () => {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (pwd.length < 8) return toast({ title: "Password must be at least 8 characters", variant: "destructive" });
    if (pwd !== confirm) return toast({ title: "Passwords do not match", variant: "destructive" });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Password updated successfully" });
    setPwd("");
    setConfirm("");
    navigate("/profile");
  };

  return (
    <Layout>
      <div className="container py-10 max-w-xl">
        <BackButton to="/profile" label="Profile" />
        <h1 className="text-3xl md:text-4xl font-bold">
          Update <span className="text-gradient-emerald">password</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a strong password of at least 8 characters.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 glass-strong rounded-2xl p-6 md:p-8 space-y-5"
        >
          <div>
            <Label>New password</Label>
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
          </div>
          <div>
            <Label>Confirm new password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button
            onClick={submit}
            disabled={busy || !pwd || !confirm}
            className="bg-gradient-emerald text-primary-foreground shadow-glow-emerald"
          >
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <KeyRound className="h-4 w-4 mr-1" />}
            Update password
          </Button>
        </motion.div>
      </div>
    </Layout>
  );
};

export default UpdatePassword;
