import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { HardDrive, Trash2, RefreshCw } from "lucide-react";

type Stat = { bucket_id: string; file_count: number; total_bytes: number };

const FREE_TIER_BYTES = 1024 * 1024 * 1024; // 1 GB reference

const fmt = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

export const StorageMonitor = () => {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(365);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_storage_stats");
    if (error) toast({ title: "Failed to load stats", description: error.message, variant: "destructive" });
    setStats((data as Stat[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalBytes = stats.reduce((s, r) => s + Number(r.total_bytes || 0), 0);
  const totalFiles = stats.reduce((s, r) => s + Number(r.file_count || 0), 0);
  const usedPct = Math.min(100, (totalBytes / FREE_TIER_BYTES) * 100);

  const clearOld = async () => {
    if (!confirm(`Delete all events older than ${days} days? This cannot be undone.`)) return;
    const { data, error } = await supabase.rpc("delete_old_events", { _days: days });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: `Deleted ${data ?? 0} old event(s)` });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Storage usage</h3>
          </div>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Used: {fmt(totalBytes)} · {totalFiles} files</span>
            <span className="text-muted-foreground">of {fmt(FREE_TIER_BYTES)} reference</span>
          </div>
          <Progress value={usedPct} />
        </div>

        <div className="grid gap-2">
          {stats.map((s) => (
            <div key={s.bucket_id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <div className="font-medium">{s.bucket_id}</div>
              <div className="text-muted-foreground">{s.file_count} files · {fmt(Number(s.total_bytes))}</div>
            </div>
          ))}
          {stats.length === 0 && !loading && (
            <div className="text-center text-muted-foreground py-6 text-sm">No files uploaded yet.</div>
          )}
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <h3 className="font-semibold flex items-center gap-2"><Trash2 className="h-4 w-4 text-destructive" />Clear old data</h3>
        <p className="text-xs text-muted-foreground mt-1">Permanently delete events whose date is older than the threshold.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Older than (days)</Label>
            <Input type="number" min={30} value={days} onChange={(e) => setDays(Number(e.target.value) || 0)} className="w-32 mt-1" />
          </div>
          <Button variant="destructive" onClick={clearOld}><Trash2 className="h-4 w-4 mr-1" />Delete old events</Button>
        </div>
      </div>
    </div>
  );
};
