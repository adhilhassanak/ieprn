import { useEffect, useState, FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Trash2, UserPlus, Save, ExternalLink } from "lucide-react";

const EventManage = () => {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [coordEmail, setCoordEmail] = useState("");
  const [participants, setParticipants] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    const [{ data: ev }, { data: cs }, { data: ps }] = await Promise.all([
      supabase.from("events").select("*").eq("id", id).maybeSingle(),
      supabase.from("event_coordinators").select("id, user_id, profiles:profiles!event_coordinators_user_id_fkey(full_name,email)").eq("event_id", id),
      supabase.from("event_participants").select("*").eq("event_id", id).order("created_at", { ascending: false }),
    ]);
    setEvent(ev);
    setCoordinators(cs ?? []);
    setParticipants(ps ?? []);
  };

  useEffect(() => { load(); }, [id]);

  if (!event) return <Layout><div className="container py-20 text-center text-muted-foreground">Loading…</div></Layout>;

  const canEdit = isAdmin || event.created_by === user?.id;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("events").update({
      name: event.name,
      description: event.description,
      community: event.community,
      event_date: event.event_date || null,
      event_time: event.event_time,
      venue: event.venue,
      status: event.status,
      expected_participants: event.expected_participants,
      actual_participants: event.actual_participants,
      funds_received: event.funds_received,
    }).eq("id", event.id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
  };

  const removeCoord = async (cid: string) => {
    const { error } = await supabase.from("event_coordinators").delete().eq("id", cid);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    load();
  };

  const addCoord = async () => {
    const email = coordEmail.trim().toLowerCase();
    if (!email) return;
    const { data: prof } = await supabase.from("profiles").select("user_id").eq("email", email).maybeSingle();
    if (!prof) return toast({ title: "User not found", description: "They must sign up first.", variant: "destructive" });
    const { error } = await supabase.from("event_coordinators").insert({ event_id: event.id, user_id: prof.user_id });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    // upgrade their role to coordinator (best-effort; admins only via RLS)
    if (isAdmin) await supabase.from("user_roles").insert({ user_id: prof.user_id, role: "coordinator" }).then(() => {});
    setCoordEmail("");
    load();
    toast({ title: "Coordinator added" });
  };

  const deleteEvent = async () => {
    if (!confirm("Delete this event?")) return;
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    navigate("/dashboard");
  };

  return (
    <Layout>
      <div className="container py-10 max-w-4xl">
        <BackButton />
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">{event.name}</h1>
            <div className="mt-2 flex gap-2 items-center">
              <Badge variant="outline" className="border-gold/40 text-gold">{event.community}</Badge>
              <Badge variant="outline" className="capitalize">{event.status}</Badge>
            </div>
          </div>
          <Button asChild variant="outline" size="sm"><Link to={`/events/${event.id}`}><ExternalLink className="h-3.5 w-3.5 mr-1" />Public page</Link></Button>
        </div>

        {canEdit && (
          <form onSubmit={save} className="mt-6 glass-strong rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Edit details</h2>
            <div><Label>Name</Label><Input value={event.name} onChange={(e) => setEvent({ ...event, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={event.description ?? ""} onChange={(e) => setEvent({ ...event, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={event.status} onValueChange={(v) => setEvent({ ...event, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Venue</Label><Input value={event.venue ?? ""} onChange={(e) => setEvent({ ...event, venue: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={event.event_date ?? ""} onChange={(e) => setEvent({ ...event, event_date: e.target.value })} /></div>
              <div><Label>Time</Label><Input value={event.event_time ?? ""} onChange={(e) => setEvent({ ...event, event_time: e.target.value })} /></div>
              <div><Label>Expected</Label><Input type="number" value={event.expected_participants} onChange={(e) => setEvent({ ...event, expected_participants: parseInt(e.target.value || "0") })} /></div>
              <div><Label>Actual</Label><Input type="number" value={event.actual_participants} onChange={(e) => setEvent({ ...event, actual_participants: parseInt(e.target.value || "0") })} /></div>
              <div className="col-span-2"><Label>Funds received (₹)</Label><Input type="number" value={event.funds_received} onChange={(e) => setEvent({ ...event, funds_received: parseFloat(e.target.value || "0") })} /></div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="bg-gradient-emerald text-primary-foreground"><Save className="h-4 w-4 mr-1" />Save</Button>
              <Button type="button" variant="destructive" onClick={deleteEvent}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
            </div>
          </form>
        )}

        {/* Coordinators */}
        <section className="mt-8 glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Coordinators</h2>
          <div className="mt-3 flex gap-2">
            <Input placeholder="user@email.com" value={coordEmail} onChange={(e) => setCoordEmail(e.target.value)} />
            <Button onClick={addCoord}><UserPlus className="h-4 w-4 mr-1" />Add</Button>
          </div>
          <ul className="mt-4 space-y-2">
            {coordinators.length === 0 && <li className="text-sm text-muted-foreground">No coordinators yet.</li>}
            {coordinators.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span>{c.profiles?.full_name ?? "—"} <span className="text-muted-foreground">{c.profiles?.email}</span></span>
                <Button size="icon" variant="ghost" onClick={() => removeCoord(c.id)}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        </section>

        {/* Participants */}
        <section className="mt-8 glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Participants ({participants.length})</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                <tr><th className="py-2">Name</th><th>Gmail</th><th>Phone</th><th>Sem</th></tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="py-2">{p.full_name}</td><td>{p.gmail}</td><td>{p.phone}</td><td>{p.semester}</td>
                  </tr>
                ))}
                {participants.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No participants yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default EventManage;
