import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, X, ImagePlus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

export type QType = "short" | "paragraph" | "choice" | "checkbox" | "dropdown" | "date" | "file";
export type Question = { id: string; label: string; type: QType; options: string[]; required: boolean; image_url?: string };

const TYPES: { v: QType; l: string }[] = [
  { v: "short", l: "Short answer" },
  { v: "paragraph", l: "Paragraph" },
  { v: "choice", l: "Multiple choice" },
  { v: "checkbox", l: "Checkboxes" },
  { v: "dropdown", l: "Dropdown" },
  { v: "date", l: "Date" },
  { v: "file", l: "File upload" },
];
const hasOptions = (t: QType) => t === "choice" || t === "checkbox" || t === "dropdown";
const IMG_MAX = 500 * 1024;
const FILE_MAX = 2 * 1024 * 1024;

async function uploadFile(f: File, sub: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to upload files");
  const path = `${user.id}/${sub}/${Date.now()}-${f.name.replace(/[^a-z0-9.\-]/gi, "_")}`;
  const { error } = await supabase.storage.from("event-posters").upload(path, f);
  if (error) throw error;
  return supabase.storage.from("event-posters").getPublicUrl(path).data.publicUrl;
}

export const QuestionBuilder = ({ value, onChange }: { value: Question[]; onChange: (q: Question[]) => void }) => {
  const upd = (i: number, patch: Partial<Question>) => onChange(value.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const n = [...value];
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  const add = () => onChange([...value, { id: crypto.randomUUID(), label: "", type: "short", options: [], required: false }]);

  return (
    <div className="space-y-3">
      {value.map((q, i) => (
        <QuestionCard key={q.id} q={q} i={i} total={value.length} upd={upd} move={move} remove={() => onChange(value.filter((_, j) => j !== i))} />
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" /> Add question</Button>
    </div>
  );
};

const QuestionCard = ({ q, i, total, upd, move, remove }: any) => {
  const imgRef = useRef<HTMLInputElement>(null);
  const onImg = async (f?: File) => {
    if (!f) return;
    if (f.size > IMG_MAX) return toast({ title: "Image too large", description: "Max 500 KB", variant: "destructive" });
    try { upd(i, { image_url: await uploadFile(f, "questions") }); }
    catch (e: any) { toast({ title: "Upload failed", description: e.message, variant: "destructive" }); }
  };
  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="flex gap-2 items-start">
        <Input placeholder={`Question ${i + 1}`} value={q.label} onChange={(e) => upd(i, { label: e.target.value })} />
        <Select value={q.type} onValueChange={(v) => upd(i, { type: v, options: hasOptions(v as QType) && q.options.length === 0 ? ["Option 1"] : q.options })}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {q.image_url && (
        <div className="relative inline-block">
          <img src={q.image_url} alt="" className="max-h-40 rounded-lg" />
          <button type="button" onClick={() => upd(i, { image_url: undefined })} className="absolute top-1 right-1 rounded-full bg-background/80 p-1"><X className="h-3 w-3" /></button>
        </div>
      )}
      {hasOptions(q.type) && (
        <div className="space-y-2 pl-2">
          {q.options.map((o: string, k: number) => (
            <div key={k} className="flex gap-2">
              <Input value={o} onChange={(e) => upd(i, { options: q.options.map((x: string, m: number) => (m === k ? e.target.value : x)) })} />
              <Button type="button" variant="ghost" size="sm" onClick={() => upd(i, { options: q.options.filter((_: string, m: number) => m !== k) })}><X className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => upd(i, { options: [...q.options, `Option ${q.options.length + 1}`] })}><Plus className="h-4 w-4 mr-1" /> Add option</Button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 text-sm"><Switch checked={q.required} onCheckedChange={(v) => upd(i, { required: v })} /> Required</div>
        <div className="flex gap-1">
          <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => onImg(e.target.files?.[0])} />
          <Button type="button" variant="ghost" size="sm" onClick={() => imgRef.current?.click()}><ImagePlus className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="sm" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="sm" disabled={i === total - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="sm" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
};

export const validateAnswers = (qs: Question[], a: Record<string, any>) => {
  for (const q of qs) {
    if (!q.required) continue;
    const v = a[q.id];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) return `"${q.label || "Question"}" is required`;
  }
  return null;
};

export const QuestionFields = ({ questions, answers, onChange }: { questions: Question[]; answers: Record<string, any>; onChange: (a: Record<string, any>) => void }) => {
  const set = (id: string, v: any) => onChange({ ...answers, [id]: v });
  return (
    <>
      {questions.map((q) => (
        <div key={q.id} className="md:col-span-2 space-y-2">
          <Label>{q.label}{q.required && <span className="text-destructive"> *</span>}</Label>
          {q.image_url && <img src={q.image_url} alt="" className="max-h-64 rounded-lg" />}
          {q.type === "short" && <Input value={answers[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)} maxLength={500} />}
          {q.type === "paragraph" && <Textarea rows={3} value={answers[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)} maxLength={3000} />}
          {q.type === "date" && <Input type="date" value={answers[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)} />}
          {q.type === "dropdown" && (
            <Select value={answers[q.id] ?? ""} onValueChange={(v) => set(q.id, v)}>
              <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>{q.options.filter(Boolean).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {q.type === "choice" && q.options.filter(Boolean).map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm">
              <input type="radio" name={q.id} checked={answers[q.id] === o} onChange={() => set(q.id, o)} /> {o}
            </label>
          ))}
          {q.type === "checkbox" && q.options.filter(Boolean).map((o) => {
            const cur: string[] = answers[q.id] ?? [];
            return (
              <label key={o} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cur.includes(o)} onChange={(e) => set(q.id, e.target.checked ? [...cur, o] : cur.filter((x) => x !== o))} /> {o}
              </label>
            );
          })}
          {q.type === "file" && (
            <div className="space-y-1">
              <Input type="file" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > FILE_MAX) return toast({ title: "File too large", description: "Max 2 MB", variant: "destructive" });
                try { set(q.id, await uploadFile(f, "answers")); toast({ title: "File uploaded" }); }
                catch (err: any) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
              }} />
              {answers[q.id] && <a href={answers[q.id]} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Uploaded file</a>}
            </div>
          )}
        </div>
      ))}
    </>
  );
};
