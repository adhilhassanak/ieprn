import { useEffect, useState, useRef, FormEvent } from "react";
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
import { Trash2, UserPlus, Save, ExternalLink, Plus, X, CheckCircle2, Circle, Upload, FileText, Image as ImageIcon } from "lucide-react";

const EventManage = () => {
  const { id } = useParams();
  const { user, isAdmin, isCommunityCoAdmin } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [execList, setExecList] = useState<Array<{ user_id: string; full_name: string; community: string }>>([]);
  const [primaryId, setPrimaryId] = useState<string>("");
  const [secondaryId, setSecondaryId] = useState<string>("");
  const [editingCount, setEditingCount] = useState(false);
  const [countDraft, setCountDraft] = useState<string>("");

  const load = async () => {
    if (!id) return;
    const [{ data: ev }, { data: cs }, { data: ps }, { data: att }, { data: ex }] = await Promise.all([
      supabase.from("events").select("*").eq("id", id).maybeSingle(),
      supabase.from("event_coordinators").select("id, user_id").eq("event_id", id),
      supabase.from("event_participants").select("*").eq("event_id", id).order("created_at", { ascending: false }),
      supabase.from("attendance").select("*").eq("event_id", id),
      supabase.from("registrations").select("user_id, full_name, community").eq("status", "approved").order("full_name"),
    ]);
    setEvent(ev);
    setCoordinators(cs ?? []);
    setParticipants(ps ?? []);
    setExecList((ex ?? []) as any);
    setPrimaryId((cs ?? [])[0]?.user_id ?? "");
    setSecondaryId((cs ?? [])[1]?.user_id ?? "");
    const m: Record<string, boolean> = {};
    (att ?? []).forEach((a: any) => { m[a.participant_gmail] = a.present; });
    setAttendance(m);
  };

  useEffect(() => { load(); }, [id]);

  if (!event) return <Layout><div className="container py-20 text-center text-muted-foreground">Loading…</div></Layout>;

  const isAssignedCoordinator = coordinators.some((c) => c.user_id === user?.id);
  const isOwnerCoAdmin = isCommunityCoAdmin(event.community);
  const canEdit = isAdmin || isOwnerCoAdmin || event.created_by === user?.id || isAssignedCoordinator;
  const canDelete = isAdmin || isOwnerCoAdmin || event.created_by === user?.id;


  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!primaryId) {
      return toast({ title: "Primary coordinator required", description: "Select an approved executive.", variant: "destructive" });
    }
    if (secondaryId && secondaryId === primaryId) {
      return toast({ title: "Pick a different secondary", variant: "destructive" });
    }
    const selectedIds = [primaryId, secondaryId].filter(Boolean);
    const cleanCoords = selectedIds
      .map((uid) => execList.find((m) => m.user_id === uid)?.full_name)
      .filter(Boolean) as string[];

    const manual = (event.coordinator_contacts ?? []) as Array<{ name: string; gmail: string; phone: string }>;
    const validManual = manual
      .map((c) => ({ name: (c.name || "").trim(), gmail: (c.gmail || "").trim(), phone: (c.phone || "").trim() }))
      .filter((c) => c.name && c.gmail && /^\d{10}$/.test(c.phone));

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
      coordinator_names: [...cleanCoords, ...validManual.map((c) => c.name)],
      coordinator_contacts: validManual,
      expected_participants: event.expected_participants,
      actual_participants: event.actual_participants,
      funds_received: event.funds_received,
      registration_mode: event.registration_mode || "internal",
      external_form_url: event.external_form_url || null,
      whatsapp_link: event.whatsapp_link || null,
      manual_registered_count: event.manual_registered_count ?? null,
      visible_to: Array.from(new Set([event.community, ...(event.visible_to ?? [])])),
    }).eq("id", event.id);
    if (error) {
      setSaving(false);
      return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    }

    const existingIds = coordinators.map((c) => c.user_id);
    const toRemove = coordinators.filter((c) => !selectedIds.includes(c.user_id));
    const toAdd = selectedIds.filter((uid) => !existingIds.includes(uid));
    for (const c of toRemove) {
      await supabase.from("event_coordinators").delete().eq("id", c.id);
    }
    for (const uid of toAdd) {
      await supabase.from("event_coordinators").insert({ event_id: event.id, user_id: uid });
      await supabase.from("user_roles").insert({ user_id: uid, role: "coordinator" });
    }

    setSaving(false);
    toast({ title: "Saved" });
    load();
  };

  const uploadFile = async (kind: "poster" | "pdf", file: File) => {
    if (!user) return;
    const bucket = kind === "poster" ? "event-posters" : "event-pdfs";
    const maxSize = kind === "poster" ? 500 * 1024 : 1024 * 1024;
    if (file.size > maxSize) return toast({ title: "File too large", description: kind === "poster" ? "Max 500 KB" : "Max 1 MB", variant: "destructive" });
    if (kind === "pdf" && file.type !== "application/pdf") return toast({ title: "Must be a PDF", variant: "destructive" });
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-z0-9.\-]/gi, "_")}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) return toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    const col = kind === "poster" ? "poster_url" : "pdf_url";
    const { error: upErr } = await supabase.from("events").update({ [col]: url } as any).eq("id", event.id);
    if (upErr) return toast({ title: "Update failed", description: upErr.message, variant: "destructive" });
    setEvent({ ...event, [col]: url });
    toast({ title: kind === "poster" ? "Poster updated" : "Brochure updated" });
  };

  const removeFile = async (kind: "poster" | "pdf") => {
    if (!confirm(`Remove ${kind}?`)) return;
    const col = kind === "poster" ? "poster_url" : "pdf_url";
    const { error } = await supabase.from("events").update({ [col]: null } as any).eq("id", event.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setEvent({ ...event, [col]: null });
    toast({ title: "Removed" });
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
          <Button asChild variant="outline" size="sm"><Link to={`/events/${event.slug ?? event.id}`}><ExternalLink className="h-3.5 w-3.5 mr-1" />Public page</Link></Button>
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
              <Label>Coordinators <span className="text-muted-foreground text-xs">(approved executives only — 1 required, max 2)</span></Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                <div>
                  <Label className="text-xs text-muted-foreground">Primary *</Label>
                  <Select value={primaryId} onValueChange={setPrimaryId}>
                    <SelectTrigger><SelectValue placeholder="Select primary" /></SelectTrigger>
                    <SelectContent>
                      {execList.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>{m.full_name} · {m.community}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Secondary (optional)</Label>
                  <Select value={secondaryId || "__none__"} onValueChange={(v) => setSecondaryId(v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {execList.filter((m) => m.user_id !== primaryId).map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>{m.full_name} · {m.community}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Selected coordinators get edit access to this event.</p>
            </div>

            {/* Manual coordinators (name + gmail + phone) */}
            <div>
              <Label>Manual coordinators <span className="text-muted-foreground text-xs">(name, gmail & phone — all shown publicly)</span></Label>
              <div className="mt-2 space-y-2">
                {((event.coordinator_contacts ?? []) as Array<{ name: string; gmail: string; phone: string }>).map((c, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr,1fr,1fr,auto] gap-2 items-start glass rounded-lg p-2">
                    <Input placeholder="Name" value={c.name ?? ""} onChange={(ev) => {
                      const next = [...(event.coordinator_contacts ?? [])]; next[i] = { ...next[i], name: ev.target.value }; setEvent({ ...event, coordinator_contacts: next });
                    }} />
                    <Input type="email" placeholder="Gmail" value={c.gmail ?? ""} onChange={(ev) => {
                      const next = [...(event.coordinator_contacts ?? [])]; next[i] = { ...next[i], gmail: ev.target.value }; setEvent({ ...event, coordinator_contacts: next });
                    }} />
                    <Input inputMode="numeric" maxLength={10} placeholder="Phone (10 digits)" value={c.phone ?? ""} onChange={(ev) => {
                      const next = [...(event.coordinator_contacts ?? [])]; next[i] = { ...next[i], phone: ev.target.value.replace(/\D/g, "") }; setEvent({ ...event, coordinator_contacts: next });
                    }} />
                    <Button type="button" variant="ghost" size="sm" onClick={() => {
                      const next = [...(event.coordinator_contacts ?? [])]; next.splice(i, 1); setEvent({ ...event, coordinator_contacts: next });
                    }}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  const next = [...(event.coordinator_contacts ?? []), { name: "", gmail: "", phone: "" }];
                  setEvent({ ...event, coordinator_contacts: next });
                }}><Plus className="h-4 w-4 mr-1" /> Add coordinator</Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="bg-gradient-emerald text-primary-foreground"><Save className="h-4 w-4 mr-1" />Save</Button>
              {canDelete && (
                <Button type="button" variant="destructive" onClick={deleteEvent}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
              )}
            </div>
          </form>
        )}

        {/* Poster & brochure management (admin + coordinators) */}
        {canEdit && (
          <section className="mt-8 glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Event files</h2>
            <p className="text-xs text-muted-foreground mt-1">Only admin and event coordinators can upload, replace or delete.</p>
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <FileBlock
                label="Poster (image, max 500 KB)"
                icon={<ImageIcon className="h-4 w-4 text-primary" />}
                url={event.poster_url}
                accept="image/*"
                preview
                onPick={(f) => uploadFile("poster", f)}
                onDelete={() => removeFile("poster")}
              />
              <FileBlock
                label="Brochure (PDF, max 1 MB)"
                icon={<FileText className="h-4 w-4 text-primary" />}
                url={event.pdf_url}
                accept="application/pdf"
                onPick={(f) => uploadFile("pdf", f)}
                onDelete={() => removeFile("pdf")}
              />
            </div>
          </section>
        )}


        {/* Registered count override (admin or assigned coordinator) */}
        <section className="mt-8 glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Registered student count</h2>
          <div className="mt-3 grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/60 p-4">
              <div className="text-xs uppercase text-muted-foreground">Actual registrations</div>
              <div className="text-3xl font-bold mt-1">{participants.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Auto-counted from registrations.</div>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <div className="text-xs uppercase text-muted-foreground">Displayed count</div>
              <div className="text-3xl font-bold mt-1">
                {event.manual_registered_count ?? participants.length}
                {event.manual_registered_count != null && (
                  <Badge variant="outline" className="ml-2 align-middle border-gold/40 text-gold text-xs">manual</Badge>
                )}
              </div>
              {canEdit ? (
                editingCount ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={countDraft}
                      onChange={(e) => setCountDraft(e.target.value)}
                      placeholder={`auto (${participants.length})`}
                      className="max-w-[160px]"
                    />
                    <Button
                      size="sm"
                      onClick={async () => {
                        const val = countDraft.trim() === "" ? null : Math.max(0, parseInt(countDraft, 10) || 0);
                        const { error } = await supabase.from("events").update({ manual_registered_count: val }).eq("id", event.id);
                        if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
                        setEvent({ ...event, manual_registered_count: val });
                        setEditingCount(false);
                        toast({ title: "Updated" });
                      }}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingCount(false)}>Cancel</Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      setCountDraft(event.manual_registered_count != null ? String(event.manual_registered_count) : "");
                      setEditingCount(true);
                    }}
                  >
                    Edit
                  </Button>
                )
              ) : (
                <div className="text-xs text-muted-foreground mt-1">Only admin & coordinators can edit.</div>
              )}
              <div className="text-xs text-muted-foreground mt-2">Leave blank to fall back to actual count.</div>
            </div>
          </div>
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

const FileBlock = ({
  label, icon, url, accept, preview, onPick, onDelete,
}: {
  label: string; icon: React.ReactNode; url?: string | null; accept: string; preview?: boolean;
  onPick: (file: File) => void; onDelete: () => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">{icon}{label}</div>
      <div className="mt-3">
        {url ? (
          preview ? (
            <img src={url} alt="" className="h-32 w-full object-cover rounded-lg border border-border/60" />
          ) : (
            <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary underline break-all">Open current file</a>
          )
        ) : (
          <div className="text-xs text-muted-foreground">No file uploaded yet.</div>
        )}
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.currentTarget.value = ""; }} />
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => ref.current?.click()}>
          <Upload className="h-4 w-4 mr-1" />{url ? "Replace" : "Upload"}
        </Button>
        {url && (
          <Button type="button" size="sm" variant="destructive" onClick={onDelete}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
        )}
      </div>
    </div>
  );
};

export default EventManage;
