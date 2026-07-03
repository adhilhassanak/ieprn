import { useEffect, useMemo, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCommunity } from "@/lib/communities";

type Entry = {
  id: string;
  community: string;
  event_name: string;
  event_date: string;
  coordinators?: string[];
  know_more_link?: string;
  button_text?: string;
};

const CepCommunity = () => {
  const { community: key } = useParams();
  const community = getCommunity(key);
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const shortName = community?.short ?? "";

  useEffect(() => {
    if (!shortName) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("activity_calendar")
        .select(`id, community, event_name, event_date, coordinators, know_more_link, button_text`)
        .eq("community", shortName)
        .order("event_date", { ascending: true });
      setItems((data ?? []) as Entry[]);
      setLoading(false);
    })();
  }, [shortName]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  const printSelected = () => {
    const rows = items.filter((e) => selectedIds.includes(e.id));
    if (rows.length === 0) {
      alert("Please select at least one event.");
      return;
    }
    const html = `
<html><head><title>IEPRN - ${shortName} CEP</title>
<style>
body{font-family:Arial,sans-serif;padding:30px;color:#222}
.header{text-align:center;margin-bottom:25px}
.header h1{margin:0;font-size:28px;font-weight:bold}
.header h2{margin:8px 0;font-size:20px}
.header p{margin:4px 0;color:#555;font-size:14px}
table{width:100%;border-collapse:collapse;margin-top:20px}
th,td{border:1px solid #000;padding:10px;text-align:left}
th{background:#f5f5f5;font-weight:bold}
</style></head><body>
<div class="header">
  <h1>IEPRN</h1>
  <h2>${shortName} CEP - Activity Calendar</h2>
  <p>Print Date: ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"})}</p>
</div>
<table>
  <thead><tr><th>Sl. No.</th><th>Event Name</th><th>Date</th><th>Coordinators</th><th>Phone</th></tr></thead>
  <tbody>
    ${rows.map((e,i)=>`
      <tr>
        <td>${i+1}</td>
        <td><strong>${e.event_name}</strong></td>
        <td>${formatDate(e.event_date)}</td>
        <td>${e.coordinators?.length ? e.coordinators.join(", ") : "—"}</td>
        <td>${e.coordinator_phone ?? "—"}</td>
      </tr>`).join("")}
  </tbody>
</table>
</body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    win.onafterprint = () => win.close();
  };

  const accentClass = useMemo(() => {
    switch (community?.accent) {
      case "emerald": return "text-emerald-500";
      case "gold": return "text-amber-500";
      case "violet": return "text-violet-500";
      case "purple": return "text-purple-500";
      default: return "text-primary";
    }
  }, [community?.accent]);

  if (!community) return <Navigate to="/dashboard" replace />;

  return (
    <Layout>
      <div className="container py-6 sm:py-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 flex items-center gap-2">
              <CalendarDays className={`h-6 w-6 sm:h-7 sm:w-7 ${accentClass}`} />
              {shortName} CEP Task
            </h1>
            <p className="text-muted-foreground text-sm">
              {community.name} — Activity Calendar
            </p>
          </div>

          {!loading && items.length > 0 && (
            <Button variant="outline" onClick={printSelected} className="w-fit gap-2">
              <Printer className="h-4 w-4" />
              Print Selected PDF
            </Button>
          )}
        </div>

        {loading ? null : items.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
            No {shortName} activities found.
          </div>
        ) : (
          <div className="glass rounded-2xl p-2 sm:p-4 overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2 w-10 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 accent-primary"
                      checked={items.length > 0 && selectedIds.length === items.length}
                      onChange={(ev) => setSelectedIds(ev.target.checked ? items.map((i) => i.id) : [])}
                    />
                  </th>
                  <th className="p-2">Event Name</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Coordinators</th>
                  <th className="p-2">Phone</th>
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
                        onChange={(ev) =>
                          setSelectedIds(ev.target.checked
                            ? [...selectedIds, e.id]
                            : selectedIds.filter((id) => id !== e.id))
                        }
                      />
                    </td>
                    <td className="p-2 font-medium">{e.event_name}</td>
                    <td className="p-2 whitespace-nowrap">{formatDate(e.event_date)}</td>
                    <td className="p-2">
                      {e.coordinators?.length ? (
                        <div className="space-y-1">
                          {e.coordinators.map((n) => (
                            <Badge key={`${e.id}-${n}`} variant="secondary" className="block w-fit text-[11px]">
                              {n}
                            </Badge>
                          ))}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-2 whitespace-nowrap">{e.coordinator_phone ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-2">
                      {e.know_more_link ? (
                        <a href={e.know_more_link} target="_blank" rel="noopener noreferrer">
                          <Button size="sm">{e.button_text || "Know More"}</Button>
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
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

export default CepCommunity;
