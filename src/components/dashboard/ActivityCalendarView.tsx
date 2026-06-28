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
};

export const ActivityCalendarView = () => {
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("activity_calendar")
        .select(`
          id,
          community,
          event_name,
          event_date,
          coordinators,
          know_more_link,
          button_text
        `)
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
                <th className="p-2">Event Name</th>
                <th className="p-2">Event Date</th>
                <th className="p-2">Coordinators</th>
                <th className="p-2">More</th>
              </tr>
            </thead>

            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-t border-border/50">
                  <td className="p-2">
                    <Badge variant="outline">{e.community}</Badge>
                  </td>

                  <td className="p-2 font-medium">
                    {e.event_name}
                  </td>

                  <td className="p-2">
                    {new Date(e.event_date).toLocaleDateString()}
                  </td>

                  <td className="p-2">
                    {e.coordinators?.length ? (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {e.coordinators.map((name) => (
                          <Badge key={name} variant="secondary" className="whitespace-nowrap">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>

                  <td className="p-2">
                    {e.know_more_link ? (
                      <a
                        href={e.know_more_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 transition"
                      >
                        {e.button_text || "Know More"}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
