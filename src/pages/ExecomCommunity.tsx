import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCommunity } from "@/lib/communities";
import { Mail, Phone, UserCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type Member = { id: string; full_name: string; community: string; photo_url: string | null; current_position: string | null };
type Contact = { gmail: string; phone: string };

const ExecomCommunity = () => {
  const { community: communityKey } = useParams();
  const community = getCommunity(communityKey);
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [contacts, setContacts] = useState<Record<string, Contact>>({});

  useEffect(() => {
    if (!community) return;
    supabase.rpc("get_public_execom").then(({ data }) => {
      setMembers(((data ?? []) as Member[]).filter((m) => m.community === community.short));
    });
  }, [community]);

  useEffect(() => {
    if (!user || !community) return;
    supabase
      .from("registrations")
      .select("id, gmail, phone")
      .eq("status", "approved")
      .eq("community", community.short)
      .then(({ data }) => {
        const map: Record<string, Contact> = {};
        (data ?? []).forEach((r: any) => { map[r.id] = { gmail: r.gmail, phone: r.phone }; });
        setContacts(map);
      });
  }, [user, community]);

  if (!community) return <Navigate to="/" replace />;

  return (
    <Layout>
      <div className="container py-10">
        <BackButton />
        <div className="flex items-center gap-3 mt-2 mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-emerald grid place-items-center text-lg font-bold text-primary-foreground">
            {community.short.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold">{community.short} <span className="text-gradient-emerald">ExeCom</span></h1>
            <p className="text-sm text-muted-foreground">{community.name}</p>
          </div>
        </div>

        {members.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
            No approved ExeCom members yet for {community.short}.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {members.map((m) => {
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
        )}

        <div className="mt-10">
          <Button asChild variant="outline">
            <Link to="/#execom"><ArrowLeft className="h-4 w-4 mr-1" />All communities</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default ExecomCommunity;
