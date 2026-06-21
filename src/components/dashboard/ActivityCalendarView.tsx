import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Entry = {
  id: string;
  community: string;
  event_name: string;
  event_date: string;
  coordinator_name: string;
  coordinator_phone: string;
};

export const ActivityCalendarView = () => {
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("activity_calendar")
        .select("id, community, event_name, event_date, coordinator_name, coordinator_phone")
        .order("event_date", { ascending: true });
      setItems((data ?? []) as Entry[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        Activity Calendar
      </h2>
      {items.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
          No calendar entries visible to you yet.
        </div>
      ) : (
        <div className="glass rounded-2xl p-4 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">Community</th>
                <th className="p-2">Event name</th>
                <th className="p-2">Event date</th>
                <th className="p-2">Coordinator</th>
                <th className="p-2">Phone</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-t border-border/50">
                  <td className="p-2"><Badge variant="outline">{e.community}</Badge></td>
                  <td className="p-2 font-medium">{e.event_name}</td>
                  <td className="p-2">{new Date(e.event_date).toLocaleDateString()}</td>
                  <td className="p-2">{e.coordinator_name}</td>
                  <td className="p-2"><a href={`tel:${e.coordinator_phone}`} className="text-primary hover:underline">{e.coordinator_phone}</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
