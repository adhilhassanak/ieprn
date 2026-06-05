import { useEffect, useState, FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Calendar, MapPin, Clock, Users, CheckCircle2, Instagram, Linkedin, Facebook, FileText, UserCircle2, MessageCircle } from "lucide-react";
import { COMMUNITY_LIST } from "@/lib/communities";
import { useAdminSettings } from "@/hooks/useAdminSettings";

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  gmail: z.string().trim().email().max(255),
  phone: z.string().trim().regex(/^\d{10}$/, "Phone must be 10 digits"),
  semester: z.string().trim().min(1).max(20),
});

const EventDetails = () => {
  const { id } = useParams();
  const { settings } = useAdminSettings();
  const [event, setEvent] = useState<any>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [form, setForm] = useState({ full_name: "", gmail: "", phone: "", semester: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      setEvent(data);
      const { count } = await supabase.from("event_participants").select("*", { count: "exact", head: true }).eq("event_id", id);
      setParticipantCount(count ?? 0);

      // check existing registration by current user's email (if logged in)
      const { data: auth } = await supabase.auth.getUser();
      const email = auth?.user?.email;
      if (email) {
        const { data: existing } = await supabase
          .from("event_participants")
          .select("id")
          .eq("event_id", id)
          .eq("gmail", email)
          .maybeSingle();
        if (existing) setSubmitted(true);
      }
    })();
  }, [id]);

  if (!event) return <Layout><div className="container py-20 text-center text-muted-foreground">Loading…</div></Layout>;

  const community = COMMUNITY_LIST.find((c) => c.short === event.community);
  const globalOpen = settings?.registration_open_global ?? true;
  const canRegister = event.status === "published" && event.registration_open && globalOpen;

  const register = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast({ title: "Check inputs", description: parsed.error.issues[0].message, variant: "destructive" });
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("event_participants").insert({ event_id: event.id, user_id: user?.id ?? null, ...parsed.data } as any);
    setLoading(false);
    if (error) return toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    setSubmitted(true);
  };

  return (
    <Layout>
      <div className="container py-10 max-w-3xl">
        <BackButton />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-2xl overflow-hidden">
          {event.poster_url && (
            <img src={event.poster_url} alt={event.name} className="w-full max-h-[420px] object-cover" />
          )}
          <div className="p-8">
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-gold text-gold-foreground">{event.community}</Badge>
              <Badge variant="outline" className="capitalize">{event.status}</Badge>
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold">{event.name}</h1>
            {event.description && <p className="mt-3 text-muted-foreground whitespace-pre-wrap">{event.description}</p>}

            <div className="mt-6 grid sm:grid-cols-3 gap-3 text-sm">
              {event.event_date && <Info icon={Calendar} label={new Date(event.event_date).toLocaleDateString()} />}
              {event.event_time && <Info icon={Clock} label={event.event_time} />}
              {event.venue && <Info icon={MapPin} label={event.venue} />}
              <Info icon={Users} label={`${participantCount} registered`} />
            </div>

            {event.coordinator_names?.length > 0 && (
              <div className="mt-6">
                <div className="text-xs uppercase tracking-wide text-gold mb-2">Coordinators</div>
                <div className="flex flex-wrap gap-2">
                  {event.coordinator_names.map((n: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-sm">
                      <UserCircle2 className="h-4 w-4 text-primary" /> {n}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {event.pdf_url && (
              <div className="mt-6">
                <Button asChild variant="outline" size="sm">
                  <a href={event.pdf_url} target="_blank" rel="noreferrer"><FileText className="h-4 w-4 mr-1" />Download brochure</a>
                </Button>
              </div>
            )}

            {community && (
              <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
                <span>Hosted by {community.short} ·</span>
                <div className="flex gap-2">
                  {community.social.instagram && <a href={community.social.instagram} target="_blank" rel="noreferrer" className="hover:text-primary"><Instagram className="h-4 w-4" /></a>}
                  {community.social.facebook && <a href={community.social.facebook} target="_blank" rel="noreferrer" className="hover:text-primary"><Facebook className="h-4 w-4" /></a>}
                  {community.social.linkedin && <a href={community.social.linkedin} target="_blank" rel="noreferrer" className="hover:text-primary"><Linkedin className="h-4 w-4" /></a>}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Registration */}
        <div className="mt-8 glass rounded-2xl p-6 md:p-8">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            Register
            {event.registration_mode === "external" && (
              <Badge variant="outline" className="text-xs">External Registration</Badge>
            )}
          </h2>
          {!canRegister ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {!globalOpen ? "Registrations are temporarily disabled by the admin." : "Registration is closed for this event."}
            </p>
          ) : event.registration_mode === "external" && event.external_form_url ? (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Registration for this event is handled via an external form.
              </p>
              <Button asChild className="bg-gradient-emerald text-primary-foreground shadow-glow-emerald">
                <a href={event.external_form_url} target="_blank" rel="noreferrer">
                  Register Now
                </a>
              </Button>
            </div>
          ) : submitted ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" /> You're registered! See you there.
              </div>
              {event.whatsapp_link && (
                <Button asChild className="bg-[#25D366] hover:bg-[#1ebe57] text-white">
                  <a href={event.whatsapp_link} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4 mr-2" /> Join our WhatsApp Group
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <form onSubmit={register} className="mt-4 grid gap-4 md:grid-cols-2">
              <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
              <div><Label>Gmail</Label><Input type="email" value={form.gmail} onChange={(e) => setForm({ ...form, gmail: e.target.value })} required /></div>
              <div><Label>Phone</Label><Input inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
              <div><Label>Semester</Label><Input value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} required /></div>
              <Button type="submit" disabled={loading} className="md:col-span-2 bg-gradient-emerald text-primary-foreground shadow-glow-emerald">
                {loading ? "Submitting…" : "Register for event"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
};

const Info = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <div className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2">
    <Icon className="h-4 w-4 text-primary" />
    <span>{label}</span>
  </div>
);

export default EventDetails;
