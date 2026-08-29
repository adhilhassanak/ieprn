import { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCommunity } from "@/lib/communities";
import { Mail, Phone, UserCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type Member = {
  id: string;
  full_name: string;
  community: string;
  photo_url: string | null;
  current_position: string | null;
  parent_head?: string | null;
};
type Contact = { gmail: string; phone: string };

const norm = (p: string | null | undefined) => (p ?? "").toLowerCase().trim();
const isConvenor = (p: string) => p.includes("convenor") || p.includes("convener");
const isSubLead = (p: string) => p.includes("sub lead") || p.includes("sub-lead");
const isLead = (p: string) => /^lead$/.test(p) || p.endsWith(" lead") || p.includes("lead");
const isHead = (p: string) => p.includes("head");

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

  const groups = useMemo(() => {
    const convenors: Member[] = [];
    const leads: Member[] = [];
    const subLeads: Member[] = [];
    const heads: Record<string, { head: Member | null; members: Member[] }> = {};
    const others: Member[] = [];

    for (const m of members) {
      const pos = norm(m.current_position);
      if (isConvenor(pos)) convenors.push(m);
      else if (isSubLead(pos)) subLeads.push(m);
      else if (isLead(pos)) leads.push(m);
      else if (isHead(pos)) {
        const key = (m.current_position ?? "Head").trim();
        heads[key] ??= { head: null, members: [] };
        heads[key].head = m;
      } else if (m.parent_head) {
        heads[m.parent_head] ??= { head: null, members: [] };
        heads[m.parent_head].members.push(m);
      } else others.push(m);
    }
    return { convenors, leads, subLeads, heads, others };
  }, [members]);

  if (!community) return <Navigate to="/" replace />;

  const card = (m: Member, highlight = false) => {
    const c = contacts[m.id];
    return (
      <div
        key={m.id}
        className={`glass rounded-xl p-4 transition-smooth hover:border-primary/40 ${highlight ? "border border-primary/40" : ""}`}
      >
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
  };

  const section = (label: string, list: Member[]) =>
    list.length === 0 ? null : (
      <div>
        <div className="text-xs uppercase tracking-widest text-gold mb-3">{label}</div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {list.map((m) => card(m))}
        </div>
      </div>
    );

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
          <div className="space-y-8">
            {section("Convenor", groups.convenors)}
            {section("Leads", groups.leads)}
            {section("Sub-Leads", groups.subLeads)}

            {Object.entries(groups.heads).map(([headName, group]) => (
              <div key={headName} className="space-y-3">
                <div className="text-xs uppercase tracking-widest text-gold">{headName}</div>
                {group.head && (
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {card(group.head, true)}
                  </div>
                )}
                {group.members.length > 0 && (
                  <div className="ml-4 border-l border-border/60 pl-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {group.members.map((m) => card(m))}
                  </div>
                )}
              </div>
            ))}

            {section("Members", groups.others)}
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
