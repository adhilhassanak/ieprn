import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { IndianRupee, Plus } from "lucide-react";

type Entry = {
  id: string;
  amount: number;
  note: string | null;
  updated_at: string;
};

export const FinancePanel = () => {
  const { user, isFinanceHead, isAdmin } = useAuth();
  const canEdit = isFinanceHead || isAdmin;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("finance")
      .select("id, amount, note, updated_at")
      .order("updated_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      return;
    }
    setEntries((data ?? []) as Entry[]);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n)) return toast({ title: "Enter a valid amount", variant: "destructive" });
    const { error } = await (supabase as any).from("finance").insert({
      amount: n,
      note: note.trim() || null,
      updated_by: user?.id ?? null,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Finance entry added" });
    setAmount("");
    setNote("");
    load();
  };

  const current = entries[0]?.amount ?? 0;

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Current balance</div>
        <div className="mt-1 flex items-center gap-1 text-3xl font-bold text-gold">
          <IndianRupee className="h-6 w-6" />
          {current.toLocaleString("en-IN")}
        </div>
      </div>

      {canEdit && (
        <div className="glass rounded-xl p-5">
          <h3 className="font-semibold">Add finance entry</h3>
          <div className="mt-3 grid md:grid-cols-3 gap-2">
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Note (optional)</Label>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <Button onClick={submit} className="mt-3 bg-gradient-emerald text-primary-foreground">
            <Plus className="h-4 w-4 mr-1" /> Add entry
          </Button>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-3">History</h3>
        {entries.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground">No entries yet.</div>
        ) : (
          <div className="grid gap-2">
            {entries.map((e) => (
              <div key={e.id} className="glass rounded-lg p-3 flex items-center gap-3">
                <div className="flex items-center gap-1 font-semibold">
                  <IndianRupee className="h-4 w-4" />
                  {Number(e.amount).toLocaleString("en-IN")}
                </div>
                <div className="text-sm text-muted-foreground flex-1 truncate">{e.note ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{new Date(e.updated_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
