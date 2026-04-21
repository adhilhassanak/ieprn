import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, AlertTriangle, Sparkles, X } from "lucide-react";

type Announcement = { id: string; title: string; message: string; type: string };

export const AnnouncementBanner = () => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase
      .from("announcements")
      .select("id, title, message, type")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setItems(data ?? []));
  }, []);

  const visible = items.filter((i) => !dismissed.has(i.id));
  if (visible.length === 0) return null;

  const styles: Record<string, { wrap: string; icon: any; iconColor: string }> = {
    urgent: { wrap: "border-destructive/50 shadow-[0_0_30px_hsl(var(--destructive)/0.25)]", icon: AlertTriangle, iconColor: "text-destructive" },
    recruitment: { wrap: "border-gold/50 shadow-glow-gold", icon: Sparkles, iconColor: "text-gold" },
    notice: { wrap: "border-primary/40 shadow-glow-emerald", icon: Megaphone, iconColor: "text-primary" },
  };

  return (
    <div className="container pt-4 space-y-2">
      {visible.map((a) => {
        const s = styles[a.type] ?? styles.notice;
        const Icon = s.icon;
        return (
          <div key={a.id} className={`glass-strong rounded-xl p-4 border ${s.wrap} flex items-start gap-3`}>
            <Icon className={`h-5 w-5 mt-0.5 ${s.iconColor}`} />
            <div className="flex-1">
              <div className="font-semibold">{a.title}</div>
              <div className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{a.message}</div>
            </div>
            <button onClick={() => setDismissed(new Set([...dismissed, a.id]))} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
