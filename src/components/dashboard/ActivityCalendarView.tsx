import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Entry = {
  id: string;
  community: string;
  event_name: string;
  event_date: string;
  coordinators?: string[];
  know_more_link?: string;
  button_text?: string;
  whatsapp_group_link?: string;
};

const norm = (s: string) => s.trim().toLowerCase();

export const ActivityCalendarView = () => {
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [{ data: profile }, { data: regs }, { data: rows }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("registrations").select("full_name").eq("user_id", user.id),
        (supabase as any)
          .from("activity_calendar")
          .select(`
            id,
            community,
            event_name,
            event_date,
            coordinators,
            know_more_link,
            button_text,
            whatsapp_group_link
          `)
          .order("event_date", { ascending: true }),
      ]);

      const myNames = new Set(
        [profile?.full_name, ...((regs ?? []) as any[]).map((r) => r.full_name)]
          .filter(Boolean)
          .map((n: string) => norm(n))
      );

      const mine = ((rows ?? []) as Entry[]).filter((e) =>
        (e.coordinators ?? []).some((c) => myNames.has(norm(c)))
      );

      setItems(mine);
      setLoading(false);
    })();
  }, []);

  if (loading) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = items.filter((e) => new Date(e.event_date) >= today);
  const expired = items.filter((e) => new Date(e.event_date) < today);

  const renderTable = (rows: Entry[], expiredRows = false) => (
    <div className={`glass rounded-2xl p-4 overflow-auto ${expiredRows ? "opacity-70" : ""}`}>
      <table className="w-full text-sm min-w-[560px]">
        <thead className="text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-2">Community</th>
            <th className="p-2">Event Name</th>
            <th className="p-2">Event Date</th>
            <th className="p-2">More</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="border-t border-border/50">
              <td className="p-2"><Badge variant="outline">{e.community}</Badge></td>
              <td className="p-2 font-medium">
                {e.event_name}
                {expiredRows && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">Expired</Badge>
                )}
              </td>
              <td className="p-2 whitespace-nowrap">{new Date(e.event_date).toLocaleDateString()}</td>
              <td className="p-2">
                <div className="flex flex-wrap gap-2">
                  {e.know_more_link && (
                    <a
                      href={e.know_more_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 transition"
                    >
                      {e.button_text || "Know More"}
                    </a>
                  )}
                  {e.whatsapp_group_link && (
                    <a
                      href={e.whatsapp_group_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-md border border-primary/50 px-3 py-1 text-xs font-medium hover:bg-primary/10 transition"
                    >
                      Join WhatsApp
                    </a>
                  )}
                  {!e.know_more_link && !e.whatsapp_group_link && (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mt-12 space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        My Coordinating Activities
      </h2>

      {items.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
          You are not assigned as a coordinator for any activity yet.
        </div>
      ) : (
        <>
          {upcoming.length > 0 && renderTable(upcoming)}
          {expired.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Expired</h3>
              {renderTable(expired, true)}
            </div>
          )}
        </>
      )}
    </section>
  );
};
