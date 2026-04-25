import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { HardDrive, RefreshCw, FileImage, CloudUpload, Database } from "lucide-react";

type DriveStats = {
  used: number;
  total: number;
  remaining: number;
  fileCount: number;
};

type DriveFile = {
  name: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
};

const fmt = (bytes: number) => {
  if (!bytes || bytes < 1024) return `${bytes ?? 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

export const DriveMonitor = () => {
  const [stats, setStats] = useState<DriveStats | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, filesRes] = await Promise.all([
        supabase.functions.invoke("sync-to-google", {
          body: { action: "drive_stats" },
        }),
        supabase.functions.invoke("sync-to-google", {
          body: { action: "recent_uploads", limit: 10 },
        }),
      ]);

      if (statsRes.error) throw statsRes.error;
      if (filesRes.error) throw filesRes.error;

      const s = (statsRes.data as any)?.data ?? statsRes.data;
      const f = (filesRes.data as any)?.data ?? filesRes.data;

      if (s && typeof s === "object" && "used" in s) {
        setStats({
          used: Number(s.used) || 0,
          total: Number(s.total) || 0,
          remaining: Number(s.remaining) || Math.max(0, (Number(s.total) || 0) - (Number(s.used) || 0)),
          fileCount: Number(s.fileCount) || 0,
        });
      } else {
        setStats(null);
      }
      setFiles(Array.isArray(f) ? (f as DriveFile[]) : []);
    } catch (e: any) {
      console.error("Drive monitor error:", e);
      toast({
        title: "Could not load Drive stats",
        description: e?.message ?? "Check the Google Apps Script deployment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const usedPct = stats && stats.total > 0 ? Math.min(100, (stats.used / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudUpload className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Google Drive backup</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card icon={<HardDrive className="h-4 w-4" />} label="Used" value={stats ? fmt(stats.used) : "—"} />
        <Card icon={<Database className="h-4 w-4" />} label="Remaining" value={stats ? fmt(stats.remaining) : "—"} accent="emerald" />
        <Card icon={<HardDrive className="h-4 w-4" />} label="Total quota" value={stats ? fmt(stats.total) : "—"} />
        <Card icon={<FileImage className="h-4 w-4" />} label="Files" value={stats ? String(stats.fileCount) : "—"} />
      </div>

      {stats && stats.total > 0 && (
        <div className="glass rounded-xl p-4">
          <div className="flex justify-between text-xs mb-2 text-muted-foreground">
            <span>{fmt(stats.used)} used</span>
            <span>{usedPct.toFixed(1)}%</span>
          </div>
          <Progress value={usedPct} />
        </div>
      )}

      <div>
        <h4 className="font-semibold mb-2 text-sm">Recent uploads</h4>
        {files.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center text-muted-foreground text-sm">
            No recent uploads found.
          </div>
        ) : (
          <div className="grid gap-2">
            {files.map((f, i) => (
              <a
                key={i}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="glass rounded-lg p-3 flex items-center gap-3 hover:bg-primary/5 transition-smooth"
              >
                <FileImage className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate font-medium">{f.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.mimeType} · {fmt(f.size)} · {new Date(f.createdAt).toLocaleString()}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Card = ({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "emerald";
}) => (
  <div className="glass rounded-xl p-4">
    <div className={`flex items-center gap-1.5 text-xs ${accent === "emerald" ? "text-primary" : "text-muted-foreground"}`}>
      {icon}
      {label}
    </div>
    <div className="mt-1 text-xl font-bold">{value}</div>
  </div>
);
