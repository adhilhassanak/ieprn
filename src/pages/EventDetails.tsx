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
import { Calendar, MapPin, Clock, Users, CheckCircle2, Instagram, Linkedin, Facebook } from "lucide-react";
import { COMMUNITY_LIST } from "@/lib/communities";

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  gmail: z.string().trim().email().max(255),
  phone: z.string().trim().regex(/^\d{10}$/, "Phone must be 10 digits"),
  semester: z.string().trim().min(1).max(20),
});

const EventDetails = () => {
  const { id } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [form, setForm] = useState({ full_name: "", gmail: "", phone: "", semester: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("events").select("*").eq("id", id).maybeSingle().then(({ data }) => setEvent(data));
  }, [id]);

  if (!event) return <Layout><div className="container py-20 text-center text-muted-foreground">Loading…</div></Layout>;

  const community = COMMUNITY_LIST.find((c) => c.short === event.community);
  const canRegister = event.status === "published";

  const register = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast({ title: "Check inputs", description: parsed.error.issues[0].message, variant: "destructive" });
    setLoading(true);
    const { error } = await supabase.from("event_participants").insert({ event_id: event.id, ...parsed.data } as any);
    if (!error) {
      supabase.functions.invoke("sync-to-google", {
        body: { type: "participant", event_name: event.name, community_name: event.community, ...parsed.data },
      }).catch(() => {});
    }
    setLoading(false);
    if (error) return toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    setSubmitted(true);
  };

  return (
    <Layout>
      <div className="container py-10 max-w-3xl">
        <BackButton />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-2xl p-8">
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
            {event.expected_participants > 0 && <Info icon={Users} label={`${event.expected_participants} expected`} />}
          </div>

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
        </motion.div>

        {/* Registration */}
        <div className="mt-8 glass rounded-2xl p-6 md:p-8">
          <h2 className="text-xl font-semibold">Register</h2>
          {!canRegister ? (
            <p className="mt-2 text-sm text-muted-foreground">Registration is not open for this event.</p>
          ) : submitted ? (
            <div className="mt-4 flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" /> You're registered! See you there.
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
