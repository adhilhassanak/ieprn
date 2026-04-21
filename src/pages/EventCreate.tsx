import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNITY_LIST } from "@/lib/communities";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional(),
  community: z.string().min(1),
  event_date: z.string().optional(),
  event_time: z.string().optional(),
  venue: z.string().trim().max(150).optional(),
  expected_participants: z.coerce.number().int().min(0).default(0),
  status: z.enum(["draft", "published"]),
});

const EventCreate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    community: "IIC",
    event_date: "",
    event_time: "",
    venue: "",
    expected_participants: "0",
    status: "draft" as "draft" | "published",
  });
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast({ title: "Check inputs", description: parsed.error.issues[0].message, variant: "destructive" });
    setLoading(true);
    const { data, error } = await supabase.from("events").insert({
      ...parsed.data,
      event_date: parsed.data.event_date || null,
      created_by: user.id,
    }).select().single();
    setLoading(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Event created" });
    navigate(`/events/${data.id}/manage`);
  };

  return (
    <Layout>
      <div className="container py-10 max-w-2xl">
        <BackButton />
        <h1 className="text-3xl font-bold">Create <span className="text-gradient-emerald">event</span></h1>
        <form onSubmit={submit} className="mt-6 glass-strong rounded-2xl p-6 md:p-8 space-y-4">
          <div><Label>Event name</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} required /></div>
          <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Community</Label>
              <Select value={form.community} onValueChange={(v) => set("community", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMMUNITY_LIST.map((c) => <SelectItem key={c.key} value={c.short}>{c.short}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published (registrations open)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.event_date} onChange={(e) => set("event_date", e.target.value)} /></div>
            <div><Label>Time</Label><Input value={form.event_time} placeholder="e.g. 10:00 AM" onChange={(e) => set("event_time", e.target.value)} /></div>
            <div className="col-span-2"><Label>Venue</Label><Input value={form.venue} onChange={(e) => set("venue", e.target.value)} /></div>
            <div><Label>Expected participants</Label><Input type="number" min={0} value={form.expected_participants} onChange={(e) => set("expected_participants", e.target.value)} /></div>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-emerald text-primary-foreground shadow-glow-emerald">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create event
          </Button>
        </form>
      </div>
    </Layout>
  );
};

export default EventCreate;
