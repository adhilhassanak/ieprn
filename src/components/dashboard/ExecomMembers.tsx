import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone } from "lucide-react";

type Member = {
  id: string;
  full_name: string;
  community: string;
  current_position: string | null;
  photo_url: string | null;
  gmail: string;
  phone: string;
};

export const ExecomMembers = () => {
  const { community, isAdmin } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("registrations")
        .select("id, full_name, community, current_position, photo_url, gmail, phone")
        .eq("status", "approved")
        .order("community")
        .order("full_name");
      if (!isAdmin && community) q = q.eq("community", community);
      const { data } = await q;
      setMembers((data ?? []) as Member[]);
    })();
  }, [community, isAdmin]);

  if (members.length === 0) {
    return <div className="glass rounded-2xl p-8 text-center text-muted-foreground">No approved members in your community yet.</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {members.map((m) => (
        <div key={m.id} className="glass rounded-xl p-5 flex gap-4">
          {m.photo_url ? (
            <img src={m.photo_url} alt={m.full_name} className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-secondary flex items-center justify-center text-lg font-semibold">
              {m.full_name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold truncate">{m.full_name}</div>
              <Badge variant="outline" className="text-[10px]">{m.community}</Badge>
            </div>
            {m.current_position && <div className="text-xs text-gold mt-0.5">{m.current_position}</div>}
            <a href={`mailto:${m.gmail}`} className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary truncate">
              <Mail className="h-3 w-3 shrink-0" />{m.gmail}
            </a>
            <a href={`tel:${m.phone}`} className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
              <Phone className="h-3 w-3 shrink-0" />{m.phone}
            </a>
          </div>
        </div>
      ))}
    </div>
  );
};
