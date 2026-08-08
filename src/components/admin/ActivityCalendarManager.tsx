import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Save, X, CalendarDays } from "lucide-react";
import { COMMUNITY_LIST } from "@/lib/communities";

type Entry = {
  id: string;
  community: string;
  event_name: string;
  event_date: string;
  visible_to: string[];
  coordinators?: string[];
  know_more_link?: string;
  button_text?: string;
  whatsapp_group_link?: string;
};

const EMPTY = {
  community: "IIC",
  event_name: "",
  event_date: "",
  visible_to: [] as string[],
  know_more_link: "",
  button_text: "Know More",
  coordinators: [] as string[],
  whatsapp_group_link: "",
};


export const ActivityCalendarManager = () => {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<Entry[]>([]);
  const [execomMembers, setExecomMembers] = useState<any[]>([]);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  const load = async () => {
    const { data } = await (supabase as any)
      .from("activity_calendar")
      .select("*")
      .order("event_date", { ascending: true });
    setItems((data ?? []) as Entry[]);
  };

  const loadExecom = async () => {
    const { data } = await (supabase as any)
      .from("execom_sorted")
      .select("full_name")
      .eq("status", "approved")
      .order("full_name");

    setExecomMembers(data || []);
  };

  useEffect(() => {
    load();
    loadExecom();
  }, []);

  const reset = () => {
    setForm(EMPTY);
    setEditingId(null);
  };

  const submit = async () => {
    if (!form.event_name || !form.event_date) {
      return toast({ title: "Fill all fields", variant: "destructive" });
    }
    
    const payload = {
      ...form,
      know_more_link: form.know_more_link,
      button_text: form.button_text,
      coordinators: form.coordinators ?? [],
    };

    const { error } = editingId
      ? await (supabase as any).from("activity_calendar").update(payload).eq("id", editingId)
      : await (supabase as any).from("activity_calendar").insert(payload);

    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: editingId ? "Updated" : "Created" });
    reset();
    load();
  };

  const edit = (e: Entry) => {
    setEditingId(e.id);
    setForm({
      community: e.community,
      event_name: e.event_name,
      event_date: e.event_date,
      visible_to: e.visible_to ?? [],
      know_more_link: e.know_more_link || "",
      button_text: e.button_text || "Know More",
      coordinators: e.coordinators ?? [],
      whatsapp_group_link: e.whatsapp_group_link || "",

    });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    const { error } = await (supabase as any).from("activity_calendar").delete().eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    load();
  };

  const toggleVisible = (short: string) => {
    setForm((f) => ({
      ...f,
      visible_to: f.visible_to.includes(short)
        ? f.visible_to.filter((c) => c !== short)
        : [...f.visible_to, short],
    }));
  };

  const base = filter === "ALL" ? items : items.filter((i) => i.community === filter);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const isExpired = (d: string) => new Date(d) < todayStart;
  const filtered = [
    ...base.filter((e) => !isExpired(e.event_date)).sort((a, b) => +new Date(a.event_date) - +new Date(b.event_date)),
    ...base.filter((e) => isExpired(e.event_date)).sort((a, b) => +new Date(b.event_date) - +new Date(a.event_date)),
  ];


  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">{editingId ? "Edit calendar entry" : "Add calendar entry"}</h3>
        </div>
        
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>Community</Label>
            <Select value={form.community} onValueChange={(v) => setForm({ ...form, community: v })} disabled={!isAdmin && !!editingId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMUNITY_LIST.map((c) => (
                  <SelectItem key={c.key} value={c.short}>{c.short}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Event name</Label>
            <Input value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} />
          </div>
          <div>
            <Label>Event date</Label>
            <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
          </div>
          <div>
            <Label>Upload / Know More Link</Label>
            <Input
              type="url"
              placeholder="https://example.com"
              value={form.know_more_link}
              onChange={(e) => setForm({ ...form, know_more_link: e.target.value })}
            />
          </div>
          <div>
            <Label>Button Text</Label>
            <Select
              value={form.button_text}
              onValueChange={(value) => setForm({ ...form, button_text: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Know More">Know More</SelectItem>
                <SelectItem value="Register Now">Register Now</SelectItem>
                <SelectItem value="Visit Website">Visit Website</SelectItem>
                <SelectItem value="Apply Now">Apply Now</SelectItem>
                <SelectItem value="Join Event">Join Event</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>WhatsApp Group Link</Label>
            <Input
              type="url"
              placeholder="https://chat.whatsapp.com/..."
              value={form.whatsapp_group_link}
              onChange={(e) => setForm({ ...form, whatsapp_group_link: e.target.value })}
            />
          </div>
        </div>


        <div>
          <Label>Coordinators (Maximum 10)</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {execomMembers.map((member) => {
              const selected = form.coordinators?.includes(member.full_name);
              return (
                <button
                  key={member.full_name}
                  type="button"
                  disabled={!selected && (form.coordinators?.length || 0) >= 10}
                  onClick={() => {
                    const list = form.coordinators || [];
                    if (selected) {
                      setForm({
                        ...form,
                        coordinators: list.filter((n) => n !== member.full_name),
                      });
                    } else {
                      setForm({
                        ...form,
                        coordinators: [...list, member.full_name],
                      });
                    }
                  }}
                  className={`px-3 py-1 rounded-full border text-xs transition-smooth ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/60"
                  }`}
                >
                  {member.full_name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Visible to communities (multi-select)</Label>
          <div className="flex flex-wrap gap-2">
            {COMMUNITY_LIST.map((c) => {
              const on = form.visible_to.includes(c.short);
              return (
                <button
                  type="button"
                  key={c.key}
                  onClick={() => toggleVisible(c.short)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-smooth ${
                    on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/60"
                  }`}
                >
                  {c.short}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Owning community always has access. Add others to share with them.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={submit} className="bg-gradient-emerald text-primary-foreground">
            {editingId ? <><Save className="h-4 w-4 mr-1" />Save</> : <><Plus className="h-4 w-4 mr-1" />Add</>}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={reset}><X className="h-4 w-4 mr-1" />Cancel</Button>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h3 className="font-semibold">Calendar entries ({filtered.length})</h3>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All communities</SelectItem>
              {COMMUNITY_LIST.map((c) => (
                <SelectItem key={c.key} value={c.short}>{c.short}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">Community</th>
                  <th className="p-2">Event</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Coordinators</th>
                  <th className="p-2">Visible To</th>
                  <th className="p-2">Link</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className={`border-t border-border/50 ${isExpired(e.event_date) ? "opacity-70" : ""}`}>
                    <td className="p-2"><Badge variant="outline">{e.community}</Badge></td>
                    <td className="p-2 font-medium">
                      {e.event_name}
                      {isExpired(e.event_date) && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">Expired</Badge>
                      )}
                    </td>

                    <td className="p-2">{new Date(e.event_date).toLocaleDateString()}</td>
                    <td className="p-2">
                      {e.coordinators?.length ? (
                        <div className="space-y-1">
                          {e.coordinators.map((name) => (
                            <Badge
                              key={`${e.id}-${name}`}
                              variant="secondary"
                              className="block w-fit text-[11px]"
                            >
                              {name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {(e.visible_to ?? []).map((v) => (
                          <Badge key={v} variant="secondary" className="text-[10px]">{v}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-2">
                      {e.know_more_link ? (
                        <a
                          href={e.know_more_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm">
                            {e.button_text || "Know More"}
                          </Button>
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => edit(e)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
