import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Entry = {
  id: string;
  community: string;
  event_name: string;
  event_date: string;
  coordinators?: string[];
  know_more_link?: string;
  button_text?: string;
};

const CepChallenge = () => {
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
        .eq("community", "E-Cell")
        .order("event_date", { ascending: true });

      setItems((data ?? []) as Entry[]);
      setLoading(false);
    })();
  }, []);

  return (
    <Layout>
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <CalendarDays className="h-7 w-7 text-primary" />
          CEP Challenge
        </h1>

        <p className="text-muted-foreground mb-6">
          E-Cell Activity Calendar
        </p>

        {loading ? null : items.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
            No E-Cell activities found.
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
                  <th className="p-2">Action</th>
                </tr>
              </thead>

              <tbody>
                {items.map((e) => (
                  <tr key={e.id} className="border-t border-border/50">
                    <td className="p-2">
                      <Badge variant="outline">
                        {e.community}
                      </Badge>
                    </td>

                    <td className="p-2 font-medium">
                      {e.event_name}
                    </td>

                    <td className="p-2">
                      {new Date(e.event_date).toLocaleDateString()}
                    </td>

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
                        <span className="text-muted-foreground">—</span>
                      )}
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
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CepChallenge;
