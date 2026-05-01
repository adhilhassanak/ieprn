import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMMUNITY_LIST } from "@/lib/communities";
import { Loader2, Save } from "lucide-react";

type Reg = {
  id: string;
  user_id: string;
  full_name: string;
  gmail: string;
  phone: string;
  semester: string | null;
  branch: string | null;
  division: string | null;
  community: string;
  current_position: string | null;
  previous_position: string | null;
  status: "pending" | "approved" | "rejected";
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reg: Reg | null;
  onSaved: () => void;
}

export const EditApplicationDialog = ({ open, onOpenChange, reg, onSaved }: Props) => {
  const [form, setForm] = useState<Reg | null>(reg);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(reg);
  }, [reg]);

  if (!form) return null;

  const set = <K extends keyof Reg>(k: K, v: Reg[K]) =>
    setForm((p) => (p ? { ...p, [k]: v } : p));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const prevStatus = reg?.status;
      const { error } = await supabase
        .from("registrations")
        .update({
          full_name: form.full_name,
          gmail: form.gmail,
          phone: form.phone,
          semester: form.semester,
          branch: form.branch,
          division: form.division,
          community: form.community,
          current_position: form.current_position,
          previous_position: form.previous_position,
          status: form.status,
        })
        .eq("id", form.id);
      if (error) throw error;

      // Sync side-effects when status flips to approved
      if (form.status === "approved" && prevStatus !== "approved") {
        await supabase
          .from("user_roles")
          .insert({ user_id: form.user_id, role: "executive_member" });
        await supabase
          .from("profiles")
          .update({ community: form.community })
          .eq("user_id", form.user_id);
      }

      toast({ title: "Application updated" });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit application</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 mt-2">
          <div>
            <Label>Full name</Label>
            <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div>
            <Label>Gmail</Label>
            <Input value={form.gmail} onChange={(e) => set("gmail", e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <Label>Community</Label>
            <Select value={form.community} onValueChange={(v) => set("community", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMUNITY_LIST.map((c) => (
                  <SelectItem key={c.key} value={c.short}>{c.short}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Semester</Label>
            <Input value={form.semester ?? ""} onChange={(e) => set("semester", e.target.value)} />
          </div>
          <div>
            <Label>Branch</Label>
            <Input value={form.branch ?? ""} onChange={(e) => set("branch", e.target.value)} />
          </div>
          <div>
            <Label>Division</Label>
            <Input value={form.division ?? ""} onChange={(e) => set("division", e.target.value)} />
          </div>
          <div>
            <Label>Current position</Label>
            <Input
              value={form.current_position ?? ""}
              onChange={(e) => set("current_position", e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Previous position</Label>
            <Input
              value={form.previous_position ?? ""}
              onChange={(e) => set("previous_position", e.target.value)}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => set("status", v as Reg["status"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-gradient-emerald text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
