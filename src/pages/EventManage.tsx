import { useEffect, useState, FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Trash2, UserPlus, Save, ExternalLink, Plus, X, CheckCircle2, Circle } from "lucide-react";

const EventManage = () => {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [coordEmail, setCoordEmail] = useState("");
  const [participants, setParticipants] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    const [{ data: ev }, { data: cs }, { data: ps }, { data: att }] = await Promise.all([
      supabase.from("events").select("*").eq("id", id).maybeSingle(),
      supabase.from("event_coordinators").select("id, user_id").eq("event_id", id),
      supabase.from("event_participants").select("*").eq("event_id", id).order("created_at", { ascending: false }),
      supabase.from("attendance").select("*").eq("event_id", id),
    ]);
    setEvent(ev);
    setCoordinators(cs ?? []);
    setParticipants(ps ?? []);
    const m: Record<string, boolean> = {};
    (att ?? []).forEach((a: any) => { m[a.participant_gmail] = a.present; });
    setAttendance(m);
  };

  useEffect(() => { load(); }, [id]);

  if (!event) return <Layout><div className="container py-20 text-center text-muted-foreground">Loading…</div></Layout>;

  const canEdit = isAdmin || event.created_by === user?.id;

  const updateCoordName = (i: number, v: string) => {
    setEvent({ ...event, coordinator_names: event.coordinator_names.map((x: string, j: number) => j === i ? v : x) });
  };
  const addCoordName = () => setEvent({ ...event, coordinator_names: [...(event.coordinator_names ?? []), ""] });
  const removeCoordName = (i: number) => setEvent({ ...event, coordinator_names: event.coordinator_names.filter((_: any, j: number) => j !== i) });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const cleanCoords = (event.coordinator_names ?? []).map((s: string) => s.trim()).filter(Boolean);
    if ((event.status === "published" || event.registration_open) && cleanCoords.length < 2) {
      return toast({ title: "Need 2 coordinators", description: "At least two coordinator names required.", variant: "destructive" });
    }
    setSaving(true);
    const { error } = await supabase.from("events").update({
      name: event.name,
      description: event.description,
      community: event.community,
      event_date: event.event_date || null,
      event_time: event.event_time,
      venue: event.venue,
      status: event.status,
      registration_open: event.registration_open,
      coordinator_names: cleanCoords,
      expected_participants: event.expected_participants,
      actual_participants: event.actual_participants,
      funds_received: event.funds_received,
      registration_mode: event.registration_mode || "internal",
      external_form_url: event.external_form_url || null,
      whatsapp_link: event.whatsapp_link || null,
    }).eq("id", event.id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    load();
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
    if (isAdmin) await supabase.from("user_roles").insert({ user_id: prof.user_id, role: "coordinator" });
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

  const toggleAttendance = async (p: any) => {
    const present = !attendance[p.gmail];
    setAttendance({ ...attendance, [p.gmail]: present });
    const { error } = await supabase.from("attendance").upsert({
      event_id: event.id,
      participant_id: p.id,
      participant_name: p.full_name,
      participant_gmail: p.gmail,
      present,
      marked_by: user!.id,
    }, { onConflict: "event_id,participant_gmail" });
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      setAttendance({ ...attendance, [p.gmail]: !present });
    }
  };

  return (
    <Layout>
      <div className="container py-10 max-w-4xl">
        <BackButton />
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">{event.name}</h1>
            <div className="mt-2 flex gap-2 items-center flex-wrap">
              <Badge variant="outline" className="border-gold/40 text-gold">{event.community}</Badge>
              <Badge variant="outline" className="capitalize">{event.status}</Badge>
              {event.registration_open ? (
                <Badge className="bg-primary/20 text-primary border-primary/40">Registrations open</Badge>
              ) : (
                <Badge variant="outline">Registrations closed</Badge>
              )}
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
              <div className="flex items-end gap-3">
                <div>
                  <Label>Registrations open</Label>
                  <div className="mt-2"><Switch checked={!!event.registration_open} onCheckedChange={(v) => setEvent({ ...event, registration_open: v })} /></div>
                </div>
              </div>
              <div><Label>Venue</Label><Input value={event.venue ?? ""} onChange={(e) => setEvent({ ...event, venue: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={event.event_date ?? ""} onChange={(e) => setEvent({ ...event, event_date: e.target.value })} /></div>
              <div><Label>Time</Label><Input value={event.event_time ?? ""} onChange={(e) => setEvent({ ...event, event_time: e.target.value })} /></div>
              <div><Label>Expected</Label><Input type="number" value={event.expected_participants} onChange={(e) => setEvent({ ...event, expected_participants: parseInt(e.target.value || "0") })} /></div>
              <div><Label>Actual</Label><Input type="number" value={event.actual_participants} onChange={(e) => setEvent({ ...event, actual_participants: parseInt(e.target.value || "0") })} /></div>
              <div className="col-span-2"><Label>Funds received (₹)</Label><Input type="number" value={event.funds_received} onChange={(e) => setEvent({ ...event, funds_received: parseFloat(e.target.value || "0") })} /></div>
              <div>
                <Label>Registration mode</Label>
                <Select value={event.registration_mode || "internal"} onValueChange={(v) => setEvent({ ...event, registration_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Register on Website</SelectItem>
                    <SelectItem value="external">Google Form</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {event.registration_mode === "external" && (
                <div>
                  <Label>Google Form URL</Label>
                  <Input type="url" value={event.external_form_url ?? ""} onChange={(e) => setEvent({ ...event, external_form_url: e.target.value })} placeholder="https://forms.gle/..." />
                </div>
              )}
              <div className="col-span-2"><Label>WhatsApp group link</Label><Input type="url" value={event.whatsapp_link ?? ""} onChange={(e) => setEvent({ ...event, whatsapp_link: e.target.value })} placeholder="https://chat.whatsapp.com/..." /></div>
            </div>

            <div>
              <Label>Coordinator names (minimum 2)</Label>
              <div className="space-y-2 mt-1">
                {(event.coordinator_names ?? []).map((c: string, i: number) => (
                  <div key={i} className="flex gap-2">
                    <Input value={c} onChange={(e) => updateCoordName(i, e.target.value)} placeholder={`Coordinator ${i + 1}`} />
                    {(event.coordinator_names ?? []).length > 2 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeCoordName(i)}><X className="h-4 w-4" /></Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addCoordName}><Plus className="h-3 w-3 mr-1" />Add</Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="bg-gradient-emerald text-primary-foreground"><Save className="h-4 w-4 mr-1" />Save</Button>
              <Button type="button" variant="destructive" onClick={deleteEvent}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
            </div>
          </form>
        )}

        {/* App-level coordinators (with system access) */}
        <section className="mt-8 glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold">App access — system coordinators</h2>
          <p className="text-xs text-muted-foreground mt-1">Grant the system coordinator dashboard access to specific user accounts.</p>
          <div className="mt-3 flex gap-2">
            <Input placeholder="user@email.com" value={coordEmail} onChange={(e) => setCoordEmail(e.target.value)} />
            <Button onClick={addCoord}><UserPlus className="h-4 w-4 mr-1" />Add</Button>
          </div>
          <ul className="mt-4 space-y-2">
            {coordinators.length === 0 && <li className="text-sm text-muted-foreground">No system coordinators yet.</li>}
            {coordinators.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className="text-muted-foreground">User: {c.user_id.slice(0, 8)}…</span>
                <Button size="icon" variant="ghost" onClick={() => removeCoord(c.id)}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        </section>

        {/* Participants + attendance */}
        <section className="mt-8 glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Participants & attendance ({participants.length})</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                <tr><th className="py-2">Name</th><th>Gmail</th><th>Phone</th><th>Sem</th><th>Present</th></tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="py-2">{p.full_name}</td>
                    <td>{p.gmail}</td>
                    <td>{p.phone}</td>
                    <td>{p.semester}</td>
                    <td>
                      <button type="button" onClick={() => toggleAttendance(p)} className="hover:scale-110 transition-smooth">
                        {attendance[p.gmail] ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                      </button>
                    </td>
                  </tr>
                ))}
                {participants.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No participants yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default EventManage;
