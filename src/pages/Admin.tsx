import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, Trash2, Search } from "lucide-react";

const Admin = () => {
  const [regs, setRegs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const [{ data: r }, { data: e }] = await Promise.all([
      supabase.from("registrations").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("*, profiles:profiles!events_created_by_fkey(full_name,email)").order("created_at", { ascending: false }),
    ]);
    setRegs(r ?? []);
    setEvents(e ?? []);
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (r: any, status: "approved" | "rejected") => {
    const { error } = await supabase.from("registrations").update({ status }).eq("id", r.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    if (status === "approved") {
      // grant executive_member role
      await supabase.from("user_roles").insert({ user_id: r.user_id, role: "executive_member" }).then(() => {});
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

  const filteredRegs = regs.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.full_name.toLowerCase().includes(q) || r.gmail.toLowerCase().includes(q) || r.community.toLowerCase().includes(q);
  });

  const stat = (s: string) => regs.filter((r) => r.status === s).length;

  return (
    <Layout>
      <div className="container py-10">
        <BackButton />
        <h1 className="text-3xl md:text-4xl font-bold">Admin <span className="text-gradient-emerald">control panel</span></h1>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total apps" value={regs.length} />
          <Stat label="Pending" value={stat("pending")} accent="gold" />
          <Stat label="Approved" value={stat("approved")} accent="emerald" />
          <Stat label="Events" value={events.length} />
        </div>

        <Tabs defaultValue="regs" className="mt-8">
          <TabsList className="glass">
            <TabsTrigger value="regs">Applications</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>

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
                    <div className="text-xs text-muted-foreground">{r.gmail} · {r.phone} · Sem {r.current_semester} · {r.branch}</div>
                    <div className="text-xs mt-1">Position: <span className="text-foreground">{r.current_position}</span>{r.previous_position && <> · Previous: {r.previous_position}</>}</div>
                  </div>
                  <StatusPill status={r.status} />
                  <div className="flex gap-1">
                    {r.status !== "approved" && <Button size="sm" variant="outline" onClick={() => updateStatus(r, "approved")} className="border-primary/40 text-primary"><CheckCircle2 className="h-4 w-4" /></Button>}
                    {r.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => updateStatus(r, "rejected")}><XCircle className="h-4 w-4" /></Button>}
                    <Button size="sm" variant="ghost" onClick={() => deleteReg(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {filteredRegs.length === 0 && <div className="text-center text-muted-foreground py-10">No applications.</div>}
            </div>
          </TabsContent>

          <TabsContent value="events" className="mt-4">
            <div className="grid gap-3">
              {events.map((e) => (
                <div key={e.id} className="glass rounded-xl p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium">{e.name} <Badge variant="outline" className="ml-2 text-xs">{e.community}</Badge> <Badge variant="outline" className="ml-1 text-xs capitalize">{e.status}</Badge></div>
                    <div className="text-xs text-muted-foreground">{e.event_date ? new Date(e.event_date).toLocaleDateString() : "no date"} · {e.venue ?? "—"} · by {e.profiles?.full_name ?? e.profiles?.email ?? "—"}</div>
                  </div>
                  <Button asChild size="sm" variant="ghost"><Link to={`/events/${e.id}/manage`}>Manage</Link></Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteEvent(e.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              {events.length === 0 && <div className="text-center text-muted-foreground py-10">No events.</div>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
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
