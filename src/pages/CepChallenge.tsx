import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, Printer } from "lucide-react";
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const printSelected = () => {
    const selectedRows = items.filter((e) => selectedIds.includes(e.id));

    if (selectedRows.length === 0) {
      alert("Please select at least one event.");
      return;
    }

    const html = `
<html>
<head>
  <title>IEPRN - CEP Challenge Events</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 30px;
      color: #222;
    }

    .header {
      text-align: center;
      margin-bottom: 25px;
    }

    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }

    .header h2 {
      margin: 8px 0;
      font-size: 20px;
    }

    .header p {
      margin: 4px 0;
      color: #555;
      font-size: 14px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }

    th,
    td {
      border: 1px solid #000;
      padding: 10px;
      text-align: left;
    }

    th {
      background: #f5f5f5;
      font-weight: bold;
    }

    .footer {
      margin-top: 80px;
      text-align: right;
      font-size: 15px;
    }

    .footer .name {
      font-weight: bold;
    }
  </style>
</head>

<body>

  <div class="header">
    <h1>IEPRN</h1>
    <h2>CEP Challenge - E-Cell Activity Calendar</h2>
    <p>
      Print Date :
      ${new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}
    </p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Sl. No.</th>
        <th>Event Name</th>
        <th>Date</th>
        <th>Coordinators</th>
      </tr>
    </thead>

    <tbody>
      ${selectedRows
        .map(
          (e, index) => `
            <tr>
              <td>${index + 1}</td>
              <td><strong>${e.event_name}</strong></td>
              <td>${formatDate(e.event_date)}</td>
              <td>${
                e.coordinators?.length ? e.coordinators.join(", ") : "—"
              }</td>
            </tr>
          `
        )
        .join("")}
    </tbody>
  </table>

  <div class="footer">
    <div class="name">Adil Hassan A K</div>
    <div>Convenor, E-Cell CEP</div>
  </div>

</body>
</html>
    `;

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    win.onafterprint = () => win.close();
  };

  return (
    <Layout>
      <div className="container py-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <CalendarDays className="h-7 w-7 text-primary" />
              CEP Challenge
            </h1>
            <p className="text-muted-foreground">
              E-Cell Activity Calendar
            </p>
          </div>

          {!loading && items.length > 0 && (
            <Button
              variant="outline"
              onClick={printSelected}
              className="w-fit self-start sm:self-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Selected PDF
            </Button>
          )}
        </div>

        {loading ? null : items.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
            No E-Cell activities found.
          </div>
        ) : (
          <div className="glass rounded-2xl p-4 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2 w-12 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 accent-primary"
                      checked={
                        items.length > 0 &&
                        selectedIds.length === items.length
                      }
                      onChange={(ev) => {
                        if (ev.target.checked) {
                          setSelectedIds(items.map((item) => item.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </th>
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
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 accent-primary"
                        checked={selectedIds.includes(e.id)}
                        onChange={(ev) => {
                          if (ev.target.checked) {
                            setSelectedIds([...selectedIds, e.id]);
                          } else {
                            setSelectedIds(
                              selectedIds.filter((id) => id !== e.id)
                            );
                          }
                        }}
                      />
                    </td>

                    <td className="p-2">
                      <Badge variant="outline">
                        {e.community}
                      </Badge>
                    </td>

                    <td className="p-2 font-medium">
                      {e.event_name}
                    </td>

                    <td className="p-2">
                      {formatDate(e.event_date)}
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
