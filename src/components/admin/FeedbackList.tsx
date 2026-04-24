import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Trash2, MessageSquare } from "lucide-react";

type Feedback = {
  id: string;
  user_name: string | null;
  user_email: string | null;
  message: string;
  created_at: string;
};

export const FeedbackList = () => {
  const [items, setItems] = useState<Feedback[]>([]);

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("feedback")
      .select("id, user_name, user_email, message, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      return;
    }
    setItems((data ?? []) as Feedback[]);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this feedback?")) return;
    const { error } = await (supabase as any).from("feedback").delete().eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    load();
  };

  if (items.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
        No feedback yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((f) => (
        <div key={f.id} className="glass rounded-xl p-4 flex gap-3">
          <MessageSquare className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">
              {f.user_name ?? "Anonymous"}{" "}
              <span className="text-xs text-muted-foreground">
                {f.user_email ? `· ${f.user_email}` : ""}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(f.created_at).toLocaleString()}
            </div>
            <p className="mt-2 text-sm whitespace-pre-wrap">{f.message}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => remove(f.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};
