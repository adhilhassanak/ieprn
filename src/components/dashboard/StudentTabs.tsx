import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, CheckCircle2, XCircle, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Event = { id: string; slug: string | null; name: string; community: string; event_date: string | null; venue: string | null; poster_url: string | null; status: string };

export const StudentTabs = () => {
  const { user } = useAuth();
  const [registered, setRegistered] = useState<Event[]>([]);
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState("");
  const [pastEvents, setPastEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      const { data: parts } = await supabase
        .from("event_participants")
        .select("event_id, events(*)")
        .eq("gmail", user.email);
      const evs = (parts ?? []).map((p: any) => p.events).filter(Boolean) as Event[];
      setRegistered(evs);

      if (evs.length > 0) {
        const { data: att } = await supabase
          .from("attendance")
          .select("event_id, present")
          .eq("participant_gmail", user.email)
          .in("event_id", evs.map((e) => e.id));
        setPresentIds(new Set((att ?? []).filter((a) => a.present).map((a) => a.event_id)));
      }

      const { data: pe } = await supabase
        .from("events")
        .select("*")
        .in("status", ["published", "completed"])
        .lt("event_date", new Date().toISOString().slice(0, 10))
        .order("event_date", { ascending: false })
        .limit(50);
      setPastEvents((pe ?? []) as Event[]);
    })();
  }, [user]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(() => registered.filter((e) => !e.event_date || e.event_date >= today), [registered, today]);
  const participated = useMemo(() => registered.filter((e) => presentIds.has(e.id)), [registered, presentIds]);
  const missed = useMemo(
    () => registered.filter((e) => e.event_date && e.event_date < today && !presentIds.has(e.id)),
    [registered, presentIds, today],
  );

  const submitFeedback = async () => {
    if (!feedback.trim() || !user) return;
    const { error } = await (supabase as any).from("feedback").insert({
      user_id: user.id,
      user_name: user.user_metadata?.full_name ?? null,
      user_email: user.email ?? null,
      message: feedback.trim(),
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Thanks for the feedback!" });
    setFeedback("");
  };

  return (
    <Tabs defaultValue="registered" className="mt-10">
      <TabsList className="glass flex-wrap h-auto">
        <TabsTrigger value="registered">Registered ({upcoming.length})</TabsTrigger>
        <TabsTrigger value="participated">Participated ({participated.length})</TabsTrigger>
        <TabsTrigger value="missed">Missed ({missed.length})</TabsTrigger>
        <TabsTrigger value="feedback">Feedback</TabsTrigger>
      </TabsList>

      <TabsContent value="registered" className="mt-4">
        <EventGrid events={upcoming} empty="You haven't registered for any upcoming events." />
      </TabsContent>
      <TabsContent value="participated" className="mt-4">
        <EventGrid events={participated} empty="No attended events yet." badge="present" />
      </TabsContent>
      <TabsContent value="missed" className="mt-4">
        <EventGrid events={missed} empty="No missed events." badge="missed" />
        {missed.length > 0 && pastEvents.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3">Tip: explore past events you might've enjoyed.</p>
        )}
      </TabsContent>
      <TabsContent value="feedback" className="mt-4">
        <div className="glass rounded-xl p-5 max-w-xl">
          <h3 className="font-semibold">Share your feedback</h3>
          <p className="text-xs text-muted-foreground mt-1">Tell admins how we can improve events and the portal.</p>
          <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={5} className="mt-3" placeholder="Your feedback..." />
          <Button onClick={submitFeedback} disabled={!feedback.trim()} className="mt-3 bg-gradient-emerald text-primary-foreground">
            <Send className="h-4 w-4 mr-1" />Send
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
};

const EventGrid = ({ events, empty, badge }: { events: Event[]; empty: string; badge?: "present" | "missed" }) => {
  if (events.length === 0) return <div className="glass rounded-2xl p-8 text-center text-muted-foreground">{empty}</div>;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((e) => (
        <div key={e.id} className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs text-gold uppercase">
            <Calendar className="h-3 w-3" />{e.community}
            {badge === "present" && <Badge className="ml-auto bg-primary/20 text-primary border-primary/40"><CheckCircle2 className="h-3 w-3 mr-1" />Present</Badge>}
            {badge === "missed" && <Badge variant="destructive" className="ml-auto"><XCircle className="h-3 w-3 mr-1" />Missed</Badge>}
          </div>
          <h3 className="mt-2 font-semibold">{e.name}</h3>
          {e.event_date && <p className="text-xs text-muted-foreground mt-1">{new Date(e.event_date).toLocaleDateString()} · {e.venue ?? "TBA"}</p>}
          <Button asChild size="sm" variant="ghost" className="mt-3 px-2 text-primary">
            <Link to={`/events/${e.slug ?? e.id}`}>View</Link>
          </Button>
        </div>
      ))}
    </div>
  );
};
