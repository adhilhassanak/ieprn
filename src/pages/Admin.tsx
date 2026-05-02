import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, Trash2, Search, Plus, ShieldPlus, Save, Pencil } from "lucide-react";
import { EditApplicationDialog } from "@/components/admin/EditApplicationDialog";
import { COMMUNITY_LIST } from "@/lib/communities";
import { applyTheme, THEME_PRESETS, type ThemePresetKey, loadGlassPrefs, saveGlassPrefs } from "@/hooks/useAdminSettings";
import { Slider } from "@/components/ui/slider";
import { StorageMonitor } from "@/components/admin/StorageMonitor";

import { ExecomMembers } from "@/components/dashboard/ExecomMembers";
import { FeedbackList } from "@/components/admin/FeedbackList";
import { FinancePanel } from "@/components/admin/FinancePanel";
import { ImageUploadPanel } from "@/components/admin/ImageUploadPanel";

const Admin = () => {
  const [regs, setRegs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [coAdminEmail, setCoAdminEmail] = useState("");
  const [coAdminCommunity, setCoAdminCommunity] = useState("IIC");
  const [newPos, setNewPos] = useState({ community: "IIC", role_name: "", description: "", max_count: 1 });
  const [glass, setGlass] = useState(() => loadGlassPrefs());
  const [editing, setEditing] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  const load = async () => {
    const [{ data: r }, { data: e }, { data: p }, { data: prof }, { data: rl }, { data: s }] = await Promise.all([
      supabase.from("registrations").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("*").order("created_at", { ascending: false }),
      supabase.from("positions_needed").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("admin_settings").select("*").limit(1).maybeSingle(),
    ]);
    setRegs(r ?? []);
    setEvents(e ?? []);
    setPositions(p ?? []);
    setProfiles(prof ?? []);
    setRoles(rl ?? []);
    setSettings(s);
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (r: any, status: "approved" | "rejected") => {
    const { error } = await supabase.from("registrations").update({ status }).eq("id", r.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    if (status === "approved") {
      await supabase.from("user_roles").insert({ user_id: r.user_id, role: "executive_member" });
      await supabase.from("profiles").update({ community: r.community }).eq("user_id", r.user_id);
    }
    toast({ title: `Marked ${status}` });
    load();
  };

  const deleteReg = async (id: string) => {
    if (!confirm("Delete this application?")) return;
    await supabase.from("registrations").delete().eq("id", id);
    load();
  };
  const deleteEvent = async (id: string) => {
    if (!confirm("Delete this event? Participants will be removed.")) return;
    await supabase.from("events").delete().eq("id", id);
    load();
  };
  const approveEvent = async (e: any) => {
    if ((e.coordinator_names?.length ?? 0) < 2) {
      return toast({ title: "Need 2 coordinators", description: "Add at least 2 coordinator names before publishing.", variant: "destructive" });
    }
    const { error } = await supabase.from("events").update({ status: "published", registration_open: true }).eq("id", e.id);
    if (error) return toast({ title: "Approve failed", description: error.message, variant: "destructive" });
    toast({ title: "Event approved & published" });
    load();
  };
  const rejectEvent = async (id: string) => {
    const { error } = await supabase.from("events").update({ status: "cancelled", registration_open: false }).eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Event rejected" });
    load();
  };

  const promoteCoAdmin = async () => {
    const email = coAdminEmail.trim().toLowerCase();
    if (!email) return;
    const { data: prof } = await supabase.from("profiles").select("user_id").eq("email", email).maybeSingle();
    if (!prof) return toast({ title: "User not found", variant: "destructive" });
    const { error: e1 } = await supabase.from("user_roles").insert({ user_id: prof.user_id, role: "co_admin" });
    if (e1 && !e1.message.includes("duplicate")) return toast({ title: "Failed", description: e1.message, variant: "destructive" });
    await supabase.from("profiles").update({ community: coAdminCommunity }).eq("user_id", prof.user_id);
    toast({ title: `Co-admin assigned for ${coAdminCommunity}` });
    setCoAdminEmail("");
    load();
  };

  const removeRole = async (rid: string) => {
    if (!confirm("Remove this role?")) return;
    await supabase.from("user_roles").delete().eq("id", rid);
    load();
  };

  const addPosition = async () => {
    if (!newPos.role_name.trim()) return;
    const { error } = await supabase.from("positions_needed").insert(newPos);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setNewPos({ community: "IIC", role_name: "", description: "", max_count: 1 });
    load();
  };
  const togglePosition = async (p: any) => {
    await supabase.from("positions_needed").update({ is_active: !p.is_active }).eq("id", p.id);
    load();
  };
  const deletePosition = async (id: string) => {
    await supabase.from("positions_needed").delete().eq("id", id);
    load();
  };

  const saveSettings = async () => {
    if (!settings) return;
    const { error } = await supabase.from("admin_settings").update({
      primary_color: settings.primary_color,
      accent_color: settings.accent_color,
      registration_open_global: settings.registration_open_global,
      updated_at: new Date().toISOString(),
    }).eq("id", settings.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    applyTheme(settings.primary_color, settings.accent_color);
    toast({ title: "Settings saved" });
  };

  const filteredRegs = regs.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.full_name.toLowerCase().includes(q) || r.gmail.toLowerCase().includes(q) || r.community.toLowerCase().includes(q);
  });

  const stat = (s: string) => regs.filter((r) => r.status === s).length;
  const totalParticipants = events.reduce((sum, e) => sum + (e.actual_participants || 0), 0);
  const totalFunds = events.reduce((sum, e) => sum + Number(e.funds_received || 0), 0);
  const profileMap = Object.fromEntries(profiles.map((p) => [p.user_id, p]));

  return (
    <Layout>
      <div className="container py-10">
        <BackButton />
        <h1 className="text-3xl md:text-4xl font-bold">Admin <span className="text-gradient-emerald">control panel</span></h1>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Apps" value={regs.length} />
          <Stat label="Pending" value={stat("pending")} accent="gold" />
          <Stat label="Approved" value={stat("approved")} accent="emerald" />
          <Stat label="Events" value={events.length} />
          <Stat label="₹ Funds" value={totalFunds} />
        </div>

        <Tabs defaultValue="regs" className="mt-8">
          <TabsList className="glass flex-wrap h-auto">
            <TabsTrigger value="regs">Applications</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="roles">Roles & Co-admins</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="gallery">Gallery Upload</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* APPLICATIONS */}
          <TabsContent value="regs" className="mt-4">
            <div className="relative max-w-md mb-4">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input placeholder="Search by name, email, community" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="grid gap-3">
              {filteredRegs.map((r) => (
                <div key={r.id} className="glass rounded-xl p-4 flex flex-wrap items-center gap-4">
                  {r.photo_url && <img src={r.photo_url} alt="" className="h-14 w-14 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium">{r.full_name} <Badge variant="outline" className="ml-2 text-xs">{r.community}</Badge></div>
                    <div className="text-xs text-muted-foreground">{r.gmail} · {r.phone} · Sem {r.semester} · {r.branch}</div>
                    <div className="text-xs mt-1">Position: <span className="text-foreground">{r.current_position}</span>{r.previous_position && <> · Previous: {r.previous_position}</>}</div>
                  </div>
                  <StatusPill status={r.status} />
                  <div className="flex gap-1">
                    {r.status !== "approved" && <Button size="sm" variant="outline" onClick={() => updateStatus(r, "approved")} className="border-primary/40 text-primary"><CheckCircle2 className="h-4 w-4" /></Button>}
                    {r.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => updateStatus(r, "rejected")}><XCircle className="h-4 w-4" /></Button>}
                    <Button size="sm" variant="outline" onClick={() => { setEditing(r); setEditOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteReg(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {filteredRegs.length === 0 && <div className="text-center text-muted-foreground py-10">No applications.</div>}
            </div>
          </TabsContent>

          {/* EVENTS */}
          <TabsContent value="events" className="mt-4">
            <div className="text-sm text-muted-foreground mb-3">{events.length} events · {totalParticipants} participants</div>
            <div className="grid gap-3">
              {events.map((e) => (
                <div key={e.id} className="glass rounded-xl p-4 flex flex-wrap items-center gap-3">
                  {e.poster_url && <img src={e.poster_url} alt="" className="h-14 w-14 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium">{e.name} <Badge variant="outline" className="ml-2 text-xs">{e.community}</Badge> <Badge variant="outline" className="ml-1 text-xs capitalize">{e.status}</Badge>{e.registration_open && <Badge className="ml-1 text-xs bg-primary/20 text-primary border-primary/40">reg open</Badge>}</div>
                    <div className="text-xs text-muted-foreground">{e.event_date ? new Date(e.event_date).toLocaleDateString() : "no date"} · {e.venue ?? "—"} · {e.coordinator_names?.length ?? 0} coordinators</div>
                  </div>
                  {e.status !== "published" && e.status !== "completed" && (
                    <Button size="sm" variant="outline" onClick={() => approveEvent(e)} className="border-primary/40 text-primary"><CheckCircle2 className="h-4 w-4 mr-1" />Approve</Button>
                  )}
                  {e.status !== "cancelled" && e.status !== "published" && (
                    <Button size="sm" variant="outline" onClick={() => rejectEvent(e.id)}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
                  )}
                  <Button asChild size="sm" variant="ghost"><Link to={`/events/${e.id}/manage`}>Manage</Link></Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteEvent(e.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              {events.length === 0 && <div className="text-center text-muted-foreground py-10">No events.</div>}
            </div>
          </TabsContent>

          {/* ROLES */}
          <TabsContent value="roles" className="mt-4 space-y-6">
            <div className="glass rounded-xl p-5">
              <h3 className="font-semibold flex items-center gap-2"><ShieldPlus className="h-4 w-4 text-primary" />Promote a user to Co-admin</h3>
              <div className="mt-3 grid md:grid-cols-3 gap-2">
                <Input placeholder="user@email.com" value={coAdminEmail} onChange={(e) => setCoAdminEmail(e.target.value)} />
                <Select value={coAdminCommunity} onValueChange={setCoAdminCommunity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMMUNITY_LIST.map((c) => <SelectItem key={c.key} value={c.short}>{c.short}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={promoteCoAdmin} className="bg-gradient-emerald text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Make Co-admin</Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">All role assignments</h3>
              <div className="grid gap-2">
                {roles.map((r) => {
                  const p = profileMap[r.user_id];
                  return (
                    <div key={r.id} className="glass rounded-lg p-3 flex items-center gap-3">
                      <Badge variant="outline" className="capitalize">{r.role.replace("_", " ")}</Badge>
                      <div className="text-sm flex-1">{p?.full_name ?? "—"} <span className="text-muted-foreground">{p?.email}</span> {p?.community && <span className="text-xs text-gold ml-2">({p.community})</span>}</div>
                      {r.role !== "student" && (
                        <Button size="icon" variant="ghost" onClick={() => removeRole(r.id)}><Trash2 className="h-4 w-4" /></Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* POSITIONS */}
          <TabsContent value="positions" className="mt-4 space-y-6">
            <div className="glass rounded-xl p-5">
              <h3 className="font-semibold">Add a new open position</h3>
              <div className="mt-3 grid md:grid-cols-4 gap-2">
                <Select value={newPos.community} onValueChange={(v) => setNewPos({ ...newPos, community: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMMUNITY_LIST.map((c) => <SelectItem key={c.key} value={c.short}>{c.short}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Role name (e.g. Social Media Head)" value={newPos.role_name} onChange={(e) => setNewPos({ ...newPos, role_name: e.target.value })} className="md:col-span-2" />
                <Button onClick={addPosition} className="bg-gradient-emerald text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Add</Button>
                <Textarea placeholder="Optional description" value={newPos.description} onChange={(e) => setNewPos({ ...newPos, description: e.target.value })} className="md:col-span-4" rows={2} />
              </div>
            </div>

            <div className="grid gap-3">
              {positions.map((p) => (
                <div key={p.id} className="glass rounded-xl p-4 flex items-center gap-3">
                  <Badge className="bg-gradient-gold text-gold-foreground">{p.community}</Badge>
                  <div className="flex-1">
                    <div className="font-medium">{p.role_name}</div>
                    {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                  </div>
                  <Switch checked={p.is_active} onCheckedChange={() => togglePosition(p)} />
                  <Button size="icon" variant="ghost" onClick={() => deletePosition(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              {positions.length === 0 && <div className="text-center text-muted-foreground py-10">No positions yet.</div>}
            </div>
          </TabsContent>

          {/* MEMBERS */}
          <TabsContent value="members" className="mt-4">
            <ExecomMembers />
          </TabsContent>

          {/* STORAGE */}
          <TabsContent value="storage" className="mt-4 space-y-8">
            <StorageMonitor />
          </TabsContent>

          {/* FEEDBACK */}
          <TabsContent value="feedback" className="mt-4">
            <FeedbackList />
          </TabsContent>

          {/* FINANCE */}
          <TabsContent value="finance" className="mt-4">
            <FinancePanel />
          </TabsContent>

          {/* GALLERY UPLOAD */}
          <TabsContent value="gallery" className="mt-4">
            <ImageUploadPanel />
          </TabsContent>

          {/* SETTINGS */}
          <TabsContent value="settings" className="mt-4">
            {settings && (
              <div className="glass rounded-xl p-6 space-y-6 max-w-xl">
                <div>
                  <h3 className="font-semibold">Theme presets</h3>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(Object.keys(THEME_PRESETS) as ThemePresetKey[]).map((k) => {
                      const p = THEME_PRESETS[k];
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            setSettings({ ...settings, primary_color: p.primary, accent_color: p.accent });
                            applyTheme(p.primary, p.accent);
                          }}
                          className="glass rounded-lg p-3 text-left hover:border-primary/50 transition-smooth"
                        >
                          <div className="flex gap-1 mb-2">
                            <span className="h-5 w-5 rounded-full border border-border" style={{ background: p.primary }} />
                            <span className="h-5 w-5 rounded-full border border-border" style={{ background: p.accent }} />
                          </div>
                          <div className="text-xs font-medium">{p.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Primary color</Label>
                    <div className="flex gap-2 mt-1">
                      <input type="color" value={settings.primary_color} onChange={(e) => { setSettings({ ...settings, primary_color: e.target.value }); applyTheme(e.target.value, settings.accent_color); }} className="h-10 w-14 rounded cursor-pointer bg-transparent" />
                      <Input value={settings.primary_color} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Accent (gold) color</Label>
                    <div className="flex gap-2 mt-1">
                      <input type="color" value={settings.accent_color} onChange={(e) => { setSettings({ ...settings, accent_color: e.target.value }); applyTheme(settings.primary_color, e.target.value); }} className="h-10 w-14 rounded cursor-pointer bg-transparent" />
                      <Input value={settings.accent_color} onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border border-border p-4">
                  <h3 className="font-semibold">Glass effect</h3>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>Opacity</span><span>{glass.alpha.toFixed(2)}</span>
                    </div>
                    <Slider min={0.1} max={0.95} step={0.05} value={[glass.alpha]} onValueChange={([v]) => { const next = { ...glass, alpha: v }; setGlass(next); saveGlassPrefs(next.alpha, next.blur); }} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>Blur</span><span>{glass.blur}px</span>
                    </div>
                    <Slider min={0} max={40} step={2} value={[glass.blur]} onValueChange={([v]) => { const next = { ...glass, blur: v }; setGlass(next); saveGlassPrefs(next.alpha, next.blur); }} />
                  </div>
                  <p className="text-xs text-muted-foreground">Saved locally to this browser. Live preview applied as you slide.</p>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="font-medium">Global registrations</div>
                    <div className="text-xs text-muted-foreground">Master switch for all event registrations</div>
                  </div>
                  <Switch checked={settings.registration_open_global} onCheckedChange={(v) => setSettings({ ...settings, registration_open_global: v })} />
                </div>
                <Button onClick={saveSettings} className="bg-gradient-emerald text-primary-foreground"><Save className="h-4 w-4 mr-1" />Save settings</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <EditApplicationDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        reg={editing}
        onSaved={load}
      />
    </Layout>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: number; accent?: "gold" | "emerald" }) => (
  <div className="glass rounded-xl p-4">
    <div className={`text-2xl font-bold ${accent === "gold" ? "text-gradient-gold" : accent === "emerald" ? "text-gradient-emerald" : ""}`}>{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{label}</div>
  </div>
);

const StatusPill = ({ status }: { status: string }) => {
  if (status === "approved") return <Badge className="bg-primary/20 text-primary border-primary/40"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
  return <Badge className="bg-gold/20 text-gold border-gold/40"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
};

export default Admin;   
