import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, ExternalLink } from "lucide-react";

type Popup = {
  id: string;
  title: string;
  message: string | null;
  media_url: string | null;
  media_type: string;
};

const seenKey = (id: string) => `popup-seen-${id}`;

export const CommunityPopup = () => {
  const { user, approved } = useAuth();
  const [popup, setPopup] = useState<Popup | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || !approved) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("community_popups")
        .select("id, title, message, media_url, media_type")
        .eq("active", true)
        .order("created_at", { ascending: false });

      const next = ((data ?? []) as Popup[]).find((p) => !sessionStorage.getItem(seenKey(p.id)));
      if (next) {
        setPopup(next);
        setOpen(true);
      }
    })();
  }, [user, approved]);

  const close = () => {
    if (popup) sessionStorage.setItem(seenKey(popup.id), "1");
    setOpen(false);
  };

  if (!popup) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{popup.title}</DialogTitle>
          {popup.message && <DialogDescription className="whitespace-pre-line">{popup.message}</DialogDescription>}
        </DialogHeader>

        {popup.media_url && popup.media_type === "image" && (
          <img
            src={popup.media_url}
            alt={popup.title}
            className="w-full rounded-xl object-contain max-h-[50vh]"
            loading="lazy"
          />
        )}

        {popup.media_url && popup.media_type !== "image" && (
          <a href={popup.media_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full gap-2">
              {popup.media_type === "excel" ? (
                <FileSpreadsheet className="h-4 w-4" />
              ) : popup.media_type === "pdf" ? (
                <FileText className="h-4 w-4" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Open {popup.media_type === "excel" ? "form" : popup.media_type}
            </Button>
          </a>
        )}

        <Button onClick={close} className="bg-gradient-emerald text-primary-foreground">
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  );
};
