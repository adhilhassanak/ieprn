import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Download, Loader2, Send, X } from "lucide-react";
import { jsPDF } from "jspdf";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK = [
  "How do I create an event?",
  "Write a venue permission request to the Principal",
  "Write a fund request letter for our event",
  "How do I register for ExeCom?",
];

function downloadPdf(text: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  const lines = doc.splitTextToSize(text.trim(), 515);
  let y = 60;
  for (const l of lines) {
    if (y > 790) { doc.addPage(); y = 60; }
    doc.text(l, 40, y);
    y += 18;
  }
  doc.save("request.pdf");
}

function Bubble({ m }: { m: Msg }) {
  const parts = m.content.split(/<<<REQUEST|REQUEST>>>/);
  return (
    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <div key={i} className="my-2 rounded-lg border border-border bg-background p-3 text-foreground">
            <div className="font-serif text-[13px]">{p.trim()}</div>
            <Button size="sm" className="mt-2" onClick={() => downloadPdf(p)}><Download className="h-3.5 w-3.5 mr-1" />Download PDF</Button>
          </div>
        ) : <span key={i}>{p.trim()}</span>,
      )}
    </div>
  );
}

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const { pathname } = useLocation();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  if (pathname.startsWith("/site/")) return null;

  const send = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || busy) return;
    const next = [...msgs, { role: "user" as const, content: t }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("site-assistant", { body: { messages: next.slice(-20), page: pathname } });
    let msg = (data as any)?.error;
    if (error && !msg) {
      try { msg = (await (error as any).context?.json())?.error; } catch { /* ignore */ }
      msg = msg ?? "Something went wrong.";
    }
    setBusy(false);
    setMsgs([...next, { role: "assistant", content: msg ? `⚠️ ${msg}` : (data as any).reply }]);
  };

  return (
    <>
      {!open && (
        <button
          aria-label="Open AI assistant"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-gradient-emerald text-primary-foreground shadow-glow-emerald grid place-items-center hover:scale-105 transition-smooth print:hidden"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm h-[70vh] max-h-[600px] flex flex-col rounded-2xl border border-border bg-background shadow-2xl print:hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2 font-semibold"><Bot className="h-5 w-5 text-primary" />IEprn Assistant</div>
            <button aria-label="Close assistant" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {msgs.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Hi! I can help you use this website and write requests (download as PDF).</p>
                {QUICK.map((q) => (
                  <button key={q} onClick={() => send(q)} className="block w-full text-left text-xs rounded-lg border border-border px-3 py-2 hover:bg-muted">{q}</button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => <Bubble key={i} m={m} />)}
            {busy && <div className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Thinking…</div>}
            <div ref={endRef} />
          </div>
          <div className="p-2 border-t border-border flex gap-2">
            <Textarea
              rows={1} value={input} placeholder="Ask anything…" className="min-h-[40px] resize-none"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <Button size="icon" onClick={() => send()} disabled={busy || !input.trim()} aria-label="Send"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </>
  );
}
