import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Users, Mail, Phone } from "lucide-react";

const Coordinator = () => {
  const { id } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: ev }, { data: ps }] = await Promise.all([
        supabase.from("events").select("*").eq("id", id).maybeSingle(),
        supabase.from("event_participants").select("*").eq("event_id", id).order("created_at", { ascending: false }),
      ]);
      setEvent(ev);
      setParticipants(ps ?? []);
    })();
  }, [id]);

  return (
    <Layout>
      <div className="container py-10 max-w-4xl">
        <BackButton />
        {!event ? (
          <div className="text-center text-muted-foreground py-20">Loading or no access…</div>
        ) : (
          <>
            <div className="text-xs uppercase tracking-widest text-gold">Coordinator view</div>
            <h1 className="mt-1 text-3xl font-bold">{event.name}</h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {event.event_date && <span className="flex items-center gap-1"><Calendar className="h-4 w-4 text-primary" />{new Date(event.event_date).toLocaleDateString()}</span>}
              {event.venue && <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-primary" />{event.venue}</span>}
              <Badge variant="outline" className="capitalize">{event.status}</Badge>
            </div>

            <div className="mt-8 glass-strong rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Participants</h2>
                <span className="text-sm text-muted-foreground">{participants.length} total</span>
              </div>
              <div className="mt-4 grid gap-3">
                {participants.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border/60 p-4 hover:border-primary/40 transition-smooth">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div className="font-medium">{p.full_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Semester {p.semester}</div>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1 text-right">
                        <div className="flex items-center justify-end gap-1"><Mail className="h-3 w-3" />{p.gmail}</div>
                        <div className="flex items-center justify-end gap-1"><Phone className="h-3 w-3" />{p.phone}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {participants.length === 0 && <div className="text-center text-muted-foreground py-8">No participants yet.</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Coordinator;
