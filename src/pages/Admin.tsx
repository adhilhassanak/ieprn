// 🔥 UPDATED ADMIN PANEL (DROP-IN REPLACEMENT)

import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Trash2, Download, Megaphone } from "lucide-react";

const Admin = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [regs, setRegs] = useState<any[]>([]);
  const [notice, setNotice] = useState("");

  // LOAD DATA
  const load = async () => {
    const { data: e } = await supabase.from("events").select("*");
    const { data: r } = await supabase.from("registrations").select("*");

    setEvents(e || []);
    setRegs(r || []);
  };

  useEffect(() => {
    load();
  }, []);

  // ✅ EVENT APPROVAL FLOW
  const approveEvent = async (id: string) => {
    await supabase.from("events").update({ status: "published" }).eq("id", id);
    toast({ title: "Event Approved" });
    load();
  };

  const rejectEvent = async (id: string) => {
    await supabase.from("events").update({ status: "rejected" }).eq("id", id);
    toast({ title: "Event Rejected" });
    load();
  };

  // ❌ DELETE EVENT
  const deleteEvent = async (id: string) => {
    if (!confirm("Delete event?")) return;
    await supabase.from("events").delete().eq("id", id);
    load();
  };

  // 📤 EXPORT CSV
  const exportCSV = (data: any[], filename: string) => {
    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  // 📢 ADD NOTICE
  const postNotice = async () => {
    if (!notice.trim()) return;

    await supabase.from("notices").insert({
      message: notice,
    });

    toast({ title: "Notice posted" });
    setNotice("");
  };

  return (
    <Layout>
      <div className="container py-10">
        <BackButton />
        <h1 className="text-3xl font-bold">Admin Panel</h1>

        <Tabs defaultValue="events" className="mt-6">
          <TabsList>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="notices">Notices</TabsTrigger>
          </TabsList>

          {/* EVENTS */}
          <TabsContent value="events">
            <div className="space-y-3 mt-4">
              {events.map((e) => (
                <div key={e.id} className="glass p-4 rounded-xl flex justify-between">
                  <div>
                    <div className="font-bold">{e.name}</div>
                    <div className="text-xs">{e.community}</div>

                    <Badge className="mt-1">{e.status}</Badge>
                  </div>

                  <div className="flex gap-2">
                    {e.status === "pending" && (
                      <>
                        <Button onClick={() => approveEvent(e.id)}>
                          <CheckCircle2 />
                        </Button>
                        <Button onClick={() => rejectEvent(e.id)}>
                          <XCircle />
                        </Button>
                      </>
                    )}

                    <Button onClick={() => deleteEvent(e.id)}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* PARTICIPANTS */}
          <TabsContent value="participants">
            <div className="mt-4 space-y-3">
              <Button onClick={() => exportCSV(regs, "participants.csv")}>
                <Download className="mr-2 h-4 w-4" />
                Export Participants
              </Button>

              {regs.map((r) => (
                <div key={r.id} className="glass p-3 rounded-xl">
                  <div className="font-medium">{r.full_name}</div>
                  <div className="text-xs">{r.gmail} | {r.phone}</div>
                  <div className="text-xs">Sem {r.current_semester}</div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* NOTICES */}
          <TabsContent value="notices">
            <div className="mt-4 space-y-3">
              <Input
                placeholder="Enter notice / alert"
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
              />

              <Button onClick={postNotice}>
                <Megaphone className="mr-2 h-4 w-4" />
                Post Notice
              </Button>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
