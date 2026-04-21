import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { COMMUNITY_LIST } from "@/lib/communities";
import { Mail, Phone, UserCircle2 } from "lucide-react";

type Member = { id: string; full_name: string; community: string; photo_url: string | null; current_position: string | null };
type Contact = { gmail: string; phone: string };

export const PublicExecom = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [contacts, setContacts] = useState<Record<string, Contact>>({});

  useEffect(() => {
    supabase.rpc("get_public_execom").then(({ data }) => setMembers((data ?? []) as Member[]));
  }, []);

  useEffect(() => {
    if (!user) {
      setContacts({});
      return;
    }
    // Logged-in users can read all approved registrations? RLS only allows own/admin/co_admin.
    // For non-admins, contacts will simply not be returned and we'll show "Sign in" hint.
    supabase
      .from("registrations")
      .select("id, gmail, phone")
      .eq("status", "approved")
      .then(({ data }) => {
        const map: Record<string, Contact> = {};
        (data ?? []).forEach((r: any) => {
          map[r.id] = { gmail: r.gmail, phone: r.phone };
        });
        setContacts(map);
      });
  }, [user]);

  if (members.length === 0) return null;

  const grouped = COMMUNITY_LIST.map((c) => ({
    community: c,
    list: members.filter((m) => m.community === c.short),
  })).filter((g) => g.list.length > 0);

  return (
    <section id="execom" className="py-20">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl md:text-4xl font-bold">Meet the <span className="text-gradient-emerald">ExeCom</span></h2>
          <p className="mt-2 text-muted-foreground">The students leading IIC, E-Cell, and ED Club this year.</p>
        </div>

        <div className="space-y-12">
          {grouped.map(({ community, list }) => (
            <div key={community.key}>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="h-8 w-8 rounded-lg bg-gradient-emerald grid place-items-center text-xs font-bold text-primary-foreground">{community.short.charAt(0)}</span>
                {community.short}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {list.map((m) => {
                  const c = contacts[m.id];
                  return (
                    <div key={m.id} className="glass rounded-xl p-4 hover:border-primary/40 transition-smooth">
                      <div className="flex items-center gap-3">
                        {m.photo_url ? (
                          <img src={m.photo_url} alt={m.full_name} className="h-14 w-14 rounded-lg object-cover" loading="lazy" />
                        ) : (
                          <div className="h-14 w-14 rounded-lg bg-secondary grid place-items-center"><UserCircle2 className="h-7 w-7 text-muted-foreground" /></div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{m.full_name}</div>
                          {m.current_position && <div className="text-xs text-gold truncate">{m.current_position}</div>}
                        </div>
                      </div>
                      {c ? (
                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2 truncate"><Mail className="h-3 w-3 text-primary" />{c.gmail}</div>
                          <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-primary" />{c.phone}</div>
                        </div>
                      ) : (
                        <div className="mt-3 text-[11px] text-muted-foreground italic">{user ? "Contact visible to admins" : "Sign in to see contact"}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
