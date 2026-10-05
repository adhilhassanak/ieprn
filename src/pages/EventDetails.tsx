import { useEffect, useState, FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Calendar, MapPin, Clock, Users, CheckCircle2, Instagram, Linkedin, Facebook, FileText, UserCircle2, MessageCircle, Mail, Phone } from "lucide-react";
import { COMMUNITY_LIST } from "@/lib/communities";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { QuestionFields, validateAnswers, type Question } from "@/components/events/RegistrationQuestions";

// UUID v4 pattern (case-insensitive)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useAdminSettings();
  const [event, setEvent] = useState<any>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [dbContacts, setDbContacts] = useState<{ name: string; gmail: string | null; phone: string | null }[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const param = String(id);
      const isUuid = UUID_RE.test(param);

      // Try slug first; if that fails (or input looks like UUID), fall back to id lookup.
      let data: any = null;
      if (!isUuid) {
        const r = await supabase.from("events").select("*").eq("slug", param).maybeSingle();
        data = r.data;
      }
      if (!data) {
        const r = await supabase.from("events").select("*").eq("id", param).maybeSingle();
        data = r.data;
        // Redirect legacy UUID URLs to the slug URL.
        if (data?.slug && data.slug !== param) {
          navigate(`/events/${data.slug}`, { replace: true });
          return;
        }
      }
      setEvent(data);
      if (!data) return;

      const { count } = await supabase.from("event_participants").select("*", { count: "exact", head: true }).eq("event_id", data.id);
      setParticipantCount(count ?? 0);

      // Pull coordinator phone/Gmail from their approved ExeCom records
      const { data: contacts } = await supabase.rpc("get_event_coordinator_contacts", { _event_id: data.id } as any);
      setDbContacts((contacts ?? []) as any);

      // check existing registration by current user's email (if logged in)
      const { data: auth } = await supabase.auth.getUser();
      const email = auth?.user?.email;
      if (email) {
        const { data: existing } = await supabase
          .from("event_participants")
          .select("id")
          .eq("event_id", data.id)
          .eq("gmail", email)
          .maybeSingle();
        if (existing) setSubmitted(true);
      }
    })();
  }, [id, navigate]);

  if (!event) return <Layout><div className="container py-20 text-center text-muted-foreground">Loading…</div></Layout>;

  const community = COMMUNITY_LIST.find((c) => c.short === event.community);
  const questions: Question[] = Array.isArray(event.registration_questions) ? event.registration_questions : [];
  const globalOpen = settings?.registration_open_global ?? true;
  const canRegister = event.status === "published" && event.registration_open && globalOpen;

  const register = async (e: FormEvent) => {
    e.preventDefault();
    const qErr = validateAnswers(questions, answers);
    if (qErr) return toast({ title: "Check inputs", description: qErr, variant: "destructive" });
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const answerFor = (labels: RegExp) => {
      const question = questions.find((q) => labels.test(q.label.trim()));
      const value = question ? answers[question.id] : undefined;
      return typeof value === "string" ? value.trim() : "";
    };
    const fullName = answerFor(/^(full\s*name|name)$/i)
      || String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "").trim()
      || user?.email?.split("@")[0]
      || "Participant";
    const gmail = answerFor(/^(gmail|e-?mail|email\s*address)$/i) || user?.email || "";
    const phone = answerFor(/^(phone|mobile|phone\s*number|mobile\s*number|contact\s*number)$/i);
    const semester = answerFor(/^(semester|sem)$/i);
    const { error } = await supabase.from("event_participants").insert({
      event_id: event.id,
      user_id: user?.id ?? null,
      full_name: fullName,
      gmail,
      phone,
      semester: semester || null,
      answers,
    } as any);
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
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-gradient-gold text-gold-foreground">{event.community}</Badge>
              {Array.isArray(event.collaborators) && event.collaborators.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">in collaboration with</span>
                  {event.collaborators.map((c: string) => (
                    <Badge key={c} variant="outline" className="border-primary/40 text-primary">{c}</Badge>
                  ))}
                </>
              )}
              <Badge variant="outline" className="capitalize">{event.status}</Badge>
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold">{event.name}</h1>
            {event.description && <p className="mt-3 text-muted-foreground whitespace-pre-wrap">{event.description}</p>}

            <div className="mt-6 grid sm:grid-cols-3 gap-3 text-sm">
              {event.event_date && <Info icon={Calendar} label={new Date(event.event_date).toLocaleDateString()} />}
              {event.event_time && <Info icon={Clock} label={event.event_time} />}
              {event.venue && <Info icon={MapPin} label={event.venue} />}
            </div>

            {/* Coordinators — name, email and phone are all shown publicly */}
            {(() => {
              type Coord = { name: string; gmail?: string; phone?: string };
              const contacts: Coord[] = Array.isArray(event.coordinator_contacts)
                ? event.coordinator_contacts.map((c: any) => ({ name: c?.name, gmail: c?.gmail, phone: c?.phone }))
                : [];
              const namesFromArray: Coord[] = (event.coordinator_names ?? [])
                .filter((n: string) => !contacts.some((c) => c.name === n))
                .map((n: string) => ({ name: n }));
              const all = [...contacts, ...namesFromArray].filter((c) => c.name).map((c) => {
                // Fill missing phone/Gmail from the coordinator's approved ExeCom record
                const match = dbContacts.find((d) => d.name.trim().toLowerCase() === c.name.trim().toLowerCase());
                return match ? { ...c, gmail: c.gmail || match.gmail || undefined, phone: c.phone || match.phone || undefined } : c;
              });
              if (all.length === 0) return null;
              return (
                <div className="mt-6">
                  <div className="text-xs uppercase tracking-wide text-gold mb-3">Coordinators</div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {all.map((c, i) => (
                      <div key={i} className="glass rounded-xl p-3 border border-border/60">
                        <div className="flex items-center gap-2 font-medium">
                          <UserCircle2 className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">{c.name}</span>
                        </div>
                        {(c.gmail || c.phone) && (
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {c.gmail && (
                              <a href={`mailto:${c.gmail}`} className="flex items-center gap-2 truncate hover:text-primary">
                                <Mail className="h-3 w-3 text-primary shrink-0" />
                                <span className="truncate">{c.gmail}</span>
                              </a>
                            )}
                            {c.phone && (
                              <a href={`tel:${c.phone}`} className="flex items-center gap-2 hover:text-primary">
                                <Phone className="h-3 w-3 text-primary shrink-0" />
                                <span>{c.phone}</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

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
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <a href={event.whatsapp_link} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4 mr-2" /> Join our WhatsApp Group
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <form onSubmit={register} className="mt-4 grid gap-4 md:grid-cols-2">
              <QuestionFields questions={questions} answers={answers} onChange={setAnswers} />
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
