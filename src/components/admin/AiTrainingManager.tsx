import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";

const SEP = "\n\n---\n\n";
const split = (s: string) => s.split(SEP).map((x) => x.trim()).filter(Boolean);

export function AiTrainingManager() {
  const [instr, setInstr] = useState<string[]>([]);
  const [tmpl, setTmpl] = useState<string[]>([]);
  const [newInstr, setNewInstr] = useState("");
  const [newTmpl, setNewTmpl] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("ai_assistant_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => {
      setInstr(split(data?.instructions ?? ""));
      setTmpl(split(data?.request_templates ?? ""));
    });
  }, []);

  const persist = async (i: string[], t: string[]) => {
    setBusy(true);
    const { error } = await supabase.from("ai_assistant_settings")
      .upsert({ id: 1, instructions: i.join(SEP), request_templates: t.join(SEP), updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) { toast({ title: "Could not save", description: error.message, variant: "destructive" }); return false; }
    setInstr(i); setTmpl(t);
    return true;
  };

  const add = async () => {
    if (!newInstr.trim() && !newTmpl.trim()) return;
    const ok = await persist(newInstr.trim() ? [...instr, newInstr.trim()] : instr, newTmpl.trim() ? [...tmpl, newTmpl.trim()] : tmpl);
    if (ok) { setNewInstr(""); setNewTmpl(""); toast({ title: "AI learned it", description: "Saved. Add more anytime." }); }
  };

  const List = ({ items, onDelete }: { items: string[]; onDelete: (i: number) => void }) => (
    <div className="space-y-2">
      {items.map((x, i) => (
        <div key={i} className="flex gap-2 rounded-lg border border-border p-2 text-xs whitespace-pre-wrap">
          <div className="flex-1">{x}</div>
          <Button size="icon" variant="ghost" onClick={() => onDelete(i)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Teach the AI assistant</h3>
          <p className="text-sm text-muted-foreground">Saved: {instr.length} instructions · {tmpl.length} sample letters. Add new ones below.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShow(!show)}>
          {show ? <><EyeOff className="h-4 w-4 mr-1" />Hide saved</> : <><Eye className="h-4 w-4 mr-1" />View saved</>}
        </Button>
      </div>

      {show && (
        <div className="space-y-3">
          <Label>Saved instructions</Label>
          <List items={instr} onDelete={(i) => persist(instr.filter((_, j) => j !== i), tmpl)} />
          <Label>Saved sample letters</Label>
          <List items={tmpl} onDelete={(i) => persist(instr, tmpl.filter((_, j) => j !== i))} />
        </div>
      )}

      <div>
        <Label>New instruction or fact</Label>
        <Textarea rows={4} value={newInstr} onChange={(e) => setNewInstr(e.target.value)}
          placeholder={"e.g. Principal's name is Dr. ___. Fund requests go to the Principal through the faculty coordinator."} />
      </div>
      <div>
        <Label>New sample request letter</Label>
        <Textarea rows={6} value={newTmpl} onChange={(e) => setNewTmpl(e.target.value)} className="font-mono text-xs"
          placeholder={"Paste an example request letter. The AI will copy this style."} />
      </div>
      <Button onClick={add} disabled={busy} className="bg-gradient-emerald text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Save & teach AI</Button>
    </div>
  );
}
