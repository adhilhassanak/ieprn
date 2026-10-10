import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

export function AiTrainingManager() {
  const [instructions, setInstructions] = useState("");
  const [templates, setTemplates] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("ai_assistant_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => {
      setInstructions(data?.instructions ?? "");
      setTemplates(data?.request_templates ?? "");
    });
  }, []);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("ai_assistant_settings")
      .upsert({ id: 1, instructions, request_templates: templates, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return toast({ title: "Could not save", description: error.message, variant: "destructive" });
    toast({ title: "AI assistant updated", description: "New answers will follow this training." });
  };

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="font-semibold">Train the AI assistant</h3>
        <p className="text-sm text-muted-foreground">Tell the assistant how to answer and how requests should look. It uses this for every signed-in user.</p>
      </div>
      <div>
        <Label>Instructions & facts</Label>
        <Textarea rows={8} value={instructions} onChange={(e) => setInstructions(e.target.value)}
          placeholder={"e.g. Principal's name is Dr. ___. Requests for venue go to the HOD first. Always sign as 'Convenor, IIC'. Fund requests above ₹5000 need faculty approval…"} />
      </div>
      <div>
        <Label>Request templates / sample letters</Label>
        <Textarea rows={12} value={templates} onChange={(e) => setTemplates(e.target.value)} className="font-mono text-xs"
          placeholder={"Paste example request letters here (venue request, fund request, OD request…). The AI will copy this style."} />
      </div>
      <Button onClick={save} disabled={busy} className="bg-gradient-emerald text-primary-foreground"><Save className="h-4 w-4 mr-1" />Save training</Button>
    </div>
  );
}
