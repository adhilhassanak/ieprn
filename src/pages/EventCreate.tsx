import { useState, FormEvent, useRef, useEffect } from "react";
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
import { Loader2, Upload, X, Plus, FileText } from "lucide-react";

const POSTER_MAX = 500 * 1024;
const PDF_MAX = 1024 * 1024;

const schema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional(),
  community: z.string().min(1),
  event_date: z.string().optional(),
  event_time: z.string().optional(),
  venue: z.string().trim().max(150).optional(),
  expected_participants: z.coerce.number().int().min(0).default(0),
  status: z.enum(["draft", "pending"]),
});

const EventCreate = () => {
  const { user, isApprovedExecutive, isAdmin } = useAuth();
  
  const navigate = useNavigate();
  const posterRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [poster, setPoster] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string>("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [execList, setExecList] = useState<Array<{ user_id: string; full_name: string; community: string }>>([]);
  const [primaryCoord, setPrimaryCoord] = useState<string>("");
  const [secondaryCoord, setSecondaryCoord] = useState<string>("");
  const [manualCoords, setManualCoords] = useState<Array<{ name: string; gmail: string; phone: string }>>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    community: "IIC",
    event_date: "",
    event_time: "",
    venue: "",
    expected_participants: "0",
    whatsapp_link: "",
    registration_mode: "internal" as "internal" | "external",
    external_form_url: "",
    status: "pending" as "draft" | "pending",
  });
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("registrations")
        .select("user_id, full_name, community")
        .eq("status", "approved")
        .order("full_name");
      setExecList((data ?? []) as any);
    })();
  }, []);


  const onPoster = (f: File | null) => {
    if (!f) return;
    if (f.size > POSTER_MAX) return toast({ title: "Poster too large", description: "Max 500 KB", variant: "destructive" });
    setPoster(f);
    setPosterPreview(URL.createObjectURL(f));
  };
  const onPdf = (f: File | null) => {
    if (!f) return;
    if (f.size > PDF_MAX) return toast({ title: "PDF too large", description: "Max 1 MB", variant: "destructive" });
    if (f.type !== "application/pdf") return toast({ title: "Must be a PDF", variant: "destructive" });
    setPdf(f);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!isApprovedExecutive) {
      return toast({ title: "Not approved", description: "Only approved executive members can create events.", variant: "destructive" });
    }
    const selected = [primaryCoord, secondaryCoord].filter(Boolean);
    if (!primaryCoord) {
      return toast({ title: "Primary coordinator required", description: "Select at least one approved executive as coordinator.", variant: "destructive" });
    }
    if (secondaryCoord && secondaryCoord === primaryCoord) {
      return toast({ title: "Pick a different secondary", description: "Primary and secondary coordinators must be different.", variant: "destructive" });
    }
    const coordRecords = selected
      .map((uid) => execList.find((m) => m.user_id === uid))
      .filter(Boolean) as Array<{ user_id: string; full_name: string; community: string }>;
    const validCoords = coordRecords.map((m) => m.full_name);
    if (form.registration_mode === "external" && !form.external_form_url.trim()) {
      return toast({ title: "Add Google Form link", description: "External registration requires a form URL.", variant: "destructive" });
    }

    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast({ title: "Check inputs", description: parsed.error.issues[0].message, variant: "destructive" });

    setLoading(true);
    try {
      let poster_url: string | null = null;
      let pdf_url: string | null = null;

      if (poster) {
        const path = `${user.id}/${Date.now()}-${poster.name.replace(/[^a-z0-9.\-]/gi, "_")}`;
        const { error } = await supabase.storage.from("event-posters").upload(path, poster);
        if (error) throw error;
        poster_url = supabase.storage.from("event-posters").getPublicUrl(path).data.publicUrl;
      }
      if (pdf) {
        const path = `${user.id}/${Date.now()}-${pdf.name.replace(/[^a-z0-9.\-]/gi, "_")}`;
        const { error } = await supabase.storage.from("event-pdfs").upload(path, pdf);
        if (error) throw error;
        pdf_url = supabase.storage.from("event-pdfs").getPublicUrl(path).data.publicUrl;
      }

      const payload: any = {
        ...parsed.data,
        event_date: parsed.data.event_date || null,
        created_by: user.id,
        poster_url,
        pdf_url,
        coordinator_names: validCoords,
        registration_open: false,
        whatsapp_link: form.whatsapp_link.trim() || null,
        registration_mode: form.registration_mode,
        external_form_url: form.registration_mode === "external" ? form.external_form_url.trim() : null,
      };
      const { data, error } = await supabase.from("events").insert(payload).select().single();
      if (error) throw error;

      // Grant edit access to selected executive coordinators
      for (const c of coordRecords) {
        await supabase.from("event_coordinators").insert({ event_id: data.id, user_id: c.user_id });
        await supabase.from("user_roles").insert({ user_id: c.user_id, role: "coordinator" });
      }

      toast({ title: "Event created" });
      navigate(`/events/${data.id}/manage`);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container py-10 max-w-2xl">
        <BackButton />
        <h1 className="text-3xl font-bold">Create <span className="text-gradient-emerald">event</span></h1>
        {!isApprovedExecutive ? (
          <div className="mt-4 glass border border-destructive/40 rounded-xl p-4 text-sm">
            Your executive application must be approved before you can create events.
          </div>
        ) : (
          <div className="mt-4 glass border border-gold/30 rounded-xl p-4 text-sm text-muted-foreground">
            Your event will be saved as <span className="text-gold font-medium">pending</span>. An admin or co-admin will review and publish it.
          </div>
        )}

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
                  <SelectItem value="draft">Draft (only you see it)</SelectItem>
                  <SelectItem value="pending">Submit for approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.event_date} onChange={(e) => set("event_date", e.target.value)} /></div>
            <div><Label>Time</Label><Input value={form.event_time} placeholder="e.g. 10:00 AM" onChange={(e) => set("event_time", e.target.value)} /></div>
            <div className="col-span-2"><Label>Venue</Label><Input value={form.venue} onChange={(e) => set("venue", e.target.value)} /></div>
            <div><Label>Expected participants</Label><Input type="number" min={0} value={form.expected_participants} onChange={(e) => set("expected_participants", e.target.value)} /></div>
            <div>
              <Label>Registration mode</Label>
              <Select value={form.registration_mode} onValueChange={(v) => set("registration_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Register on Website</SelectItem>
                  <SelectItem value="external">Google Form</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.registration_mode === "external" && (
              <div className="col-span-2">
                <Label>Google Form link</Label>
                <Input
                  type="url"
                  placeholder="https://forms.gle/..."
                  value={form.external_form_url}
                  onChange={(e) => set("external_form_url", e.target.value)}
                />
              </div>
            )}
            <div className="col-span-2">
              <Label>WhatsApp group link <span className="text-muted-foreground text-xs">(shown only after registration)</span></Label>
              <Input type="url" placeholder="https://chat.whatsapp.com/..." value={form.whatsapp_link} onChange={(e) => set("whatsapp_link", e.target.value)} />
            </div>
          </div>

          {/* Coordinators — must be approved executive members (1 required, max 2) */}
          <div>
            <Label>Coordinators <span className="text-muted-foreground text-xs">(approved executives only — 1 required, max 2)</span></Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              <div>
                <Label className="text-xs text-muted-foreground">Primary coordinator *</Label>
                <Select value={primaryCoord} onValueChange={setPrimaryCoord}>
                  <SelectTrigger><SelectValue placeholder="Select primary" /></SelectTrigger>
                  <SelectContent>
                    {execList.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>{m.full_name} <span className="text-xs text-muted-foreground">· {m.community}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Secondary coordinator (optional)</Label>
                <div className="flex gap-1">
                  <Select value={secondaryCoord || "__none__"} onValueChange={(v) => setSecondaryCoord(v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {execList.filter((m) => m.user_id !== primaryCoord).map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>{m.full_name} <span className="text-xs text-muted-foreground">· {m.community}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Selected coordinators automatically get edit access to this event.</p>
          </div>


          {/* Poster upload */}
          <div>
            <Label>Poster (image, max 500 KB)</Label>
            <input ref={posterRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPoster(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => posterRef.current?.click()} className="mt-1 w-full glass rounded-xl p-4 border-2 border-dashed border-border hover:border-primary/60 flex items-center justify-center gap-3 text-sm text-muted-foreground">
              {posterPreview ? <img src={posterPreview} alt="" className="h-24 rounded-lg object-cover" /> : <><Upload className="h-4 w-4" /> Click to upload poster</>}
            </button>
          </div>

          {/* PDF upload */}
          <div>
            <Label>PDF brochure (optional, max 1 MB)</Label>
            <input ref={pdfRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => onPdf(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => pdfRef.current?.click()} className="mt-1 w-full glass rounded-xl p-4 border-2 border-dashed border-border hover:border-primary/60 flex items-center justify-center gap-3 text-sm text-muted-foreground">
              {pdf ? <><FileText className="h-4 w-4 text-primary" /> {pdf.name}</> : <><Upload className="h-4 w-4" /> Click to upload PDF</>}
            </button>
          </div>

          <Button type="submit" disabled={loading || !isApprovedExecutive} className="w-full bg-gradient-emerald text-primary-foreground shadow-glow-emerald">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create event
          </Button>
        </form>
      </div>
    </Layout>
  );
};

export default EventCreate;
