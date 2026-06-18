import { useState, FormEvent, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { BackButton } from "@/components/BackButton";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Loader2 } from "lucide-react";

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Name is required").max(100),
  semester: z.string().trim().min(1, "Semester is required").max(20),
  phone: z.string().trim().regex(/^\d{10}$/, "Phone must be 10 digits"),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

const Auth = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(params.get("mode") === "signup" ? "signup" : "login");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    semester: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Check your inputs", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        // No email confirmation flow — user is auto-signed in.
        emailRedirectTo: undefined,
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone,
          semester: parsed.data.semester,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Welcome!", description: "Account created — you're signed in." });
    navigate("/dashboard");
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email: form.email, password: form.password });
    if (!parsed.success) {
      toast({ title: "Check your inputs", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }
    navigate("/dashboard");
  };

 const handleGoogle = async () => {
  setLoading(true);

  const result = await lovable.auth.signInWithOAuth("google");

  if (result.error) {
    setLoading(false);

    toast({
      title: "Google sign-in failed",
      description: result.error.message ?? "Please try again",
      variant: "destructive",
    });

    return;
  }

  // Lovable will handle the redirect automatically
  if (result.redirected) return;

  setLoading(false);
};

  const handleForgotPassword = async () => {
    if (!form.email) {
      toast({ title: "Enter your email first", description: "Type your email above, then click 'Forgot password?'", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Could not send reset email", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Check your email", description: "We sent a password reset link to your inbox." });
  };
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      <AnimatedBackground />
      <div className="w-full max-w-md">
        <BackButton to="/" label="Home" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-2xl p-8 shadow-elevated">
          <Link to="/" className="flex items-center gap-2 justify-center mb-6">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold"><span className="text-gradient-gold">I&E</span> Portal</span>
          </Link>
          <h1 className="text-2xl font-bold text-center">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            {mode === "login" ? "Sign in to continue" : "No email verification — sign up and start in seconds"}
          </p>

          <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <Label htmlFor="full_name">Full name</Label>
                  <Input id="full_name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="semester">Semester</Label>
                    <Input id="semester" placeholder="e.g. 4" value={form.semester} onChange={(e) => set("semester", e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
                  </div>
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-muted-foreground hover:text-primary transition-smooth"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input id="password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required />
            </div>
            {mode === "signup" && (
              <div>
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} required />
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full bg-gradient-emerald text-primary-foreground shadow-glow-emerald">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-background/40 px-2 text-muted-foreground">or</span></div>
          </div>

          <Button type="button" variant="outline" onClick={handleGoogle} disabled={loading} className="w-full">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c6.9 0 9.5-4.8 9.5-9 0-.6-.06-1.1-.16-1.4H12z"/>
            </svg>
            Continue with Google
          </Button>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-5 w-full text-sm text-muted-foreground hover:text-primary transition-smooth"
          >
            {mode === "login" ? "Don't have an account? Create one" : "Already have an account? Sign in"}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
