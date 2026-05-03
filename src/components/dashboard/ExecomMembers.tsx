import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type Member = {
  id: string;
  full_name: string;
  community: string;
  current_position: string | null;
  parent_head: string | null;
  photo_url: string | null;
  gmail: string;
  phone: string;
};

const isLead = (p: string) => /^lead$/.test(p) || p.endsWith(" lead");
const isSubLead = (p: string) => p.includes("sub lead") || p.includes("sub-lead");
const isHead = (p: string) => p.includes("head");

export const ExecomMembers = () => {
  const { community, isAdmin, isExecutive } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);

  const canSeeContacts = isAdmin || isExecutive;

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("registrations")
        .select("id, full_name, community, current_position, parent_head, photo_url, gmail, phone")
        .eq("status", "approved");

      if (!isAdmin && community) q = q.eq("community", community);

      const { data, error } = await q;
      if (error) {
        console.error("Error fetching execom:", error);
        return;
      }
      setMembers((data ?? []) as Member[]);
    })();
  }, [community, isAdmin]);

  // Group: community -> { leads, subLeads, heads: { headName: { head, members[] } } }
  const tree = useMemo(() => {
    const byCommunity: Record<
      string,
      {
        leads: Member[];
        subLeads: Member[];
        heads: Record<string, { head: Member | null; members: Member[] }>;
        others: Member[];
      }
    > = {};

    for (const m of members) {
      const c = m.community ?? "Other";
      byCommunity[c] ??= { leads: [], subLeads: [], heads: {}, others: [] };
      const pos = (m.current_position ?? "").toLowerCase().trim();

      if (isSubLead(pos)) {
        byCommunity[c].subLeads.push(m);
      } else if (isLead(pos)) {
        byCommunity[c].leads.push(m);
      } else if (isHead(pos)) {
        const key = m.current_position!.trim();
        byCommunity[c].heads[key] ??= { head: null, members: [] };
        byCommunity[c].heads[key].head = m;
      } else if (m.parent_head) {
        byCommunity[c].heads[m.parent_head] ??= { head: null, members: [] };
        byCommunity[c].heads[m.parent_head].members.push(m);
      } else {
        byCommunity[c].others.push(m);
      }
    }
    return byCommunity;
  }, [members]);

  if (members.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
        No approved members yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.keys(tree).sort().map((c) => {
        const g = tree[c];
        const total = g.leads.length + g.subLeads.length + g.others.length +
          Object.values(g.heads).reduce((s, h) => s + (h.head ? 1 : 0) + h.members.length, 0);
        return (
          <Collapsible key={c} defaultOpen>
            <div className="glass-strong rounded-2xl overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  <Badge className="bg-gradient-emerald text-primary-foreground">{c}</Badge>
                  <span className="text-sm text-muted-foreground">{total} members</span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </CollapsibleTrigger>

              <CollapsibleContent className="px-4 pb-4 space-y-5">
                {g.leads.length > 0 && (
                  <Section label="Leads" members={g.leads} canSeeContacts={canSeeContacts} />
                )}
                {g.subLeads.length > 0 && (
                  <Section label="Sub-Leads" members={g.subLeads} canSeeContacts={canSeeContacts} />
                )}
                {Object.entries(g.heads).map(([headName, group]) => (
                  <div key={headName} className="space-y-2">
                    <div className="text-xs uppercase tracking-widest text-gold">{headName}</div>
                    {group.head && (
                      <MemberCard m={group.head} canSeeContacts={canSeeContacts} highlight />
                    )}
                    {group.members.length > 0 && (
                      <div className="ml-6 grid gap-2 md:grid-cols-2 border-l border-border/60 pl-3">
                        {group.members.map((m) => (
                          <MemberCard key={m.id} m={m} canSeeContacts={canSeeContacts} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {g.others.length > 0 && (
                  <Section label="Members" members={g.others} canSeeContacts={canSeeContacts} />
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
};

const Section = ({
  label,
  members,
  canSeeContacts,
}: {
  label: string;
  members: Member[];
  canSeeContacts: boolean;
}) => (
  <div>
    <div className="text-xs uppercase tracking-widest text-gold mb-2">{label}</div>
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {members.map((m) => (
        <MemberCard key={m.id} m={m} canSeeContacts={canSeeContacts} />
      ))}
    </div>
  </div>
);

const MemberCard = ({
  m,
  canSeeContacts,
  highlight,
}: {
  m: Member;
  canSeeContacts: boolean;
  highlight?: boolean;
}) => (
  <div
    className={`glass rounded-xl p-4 flex gap-3 ${
      highlight ? "border border-primary/40" : ""
    }`}
  >
    {m.photo_url ? (
      <img
        src={m.photo_url}
        alt={m.full_name}
        className="h-14 w-14 rounded-lg object-cover shrink-0"
      />
    ) : (
      <div className="h-14 w-14 rounded-lg bg-secondary flex items-center justify-center text-lg font-semibold shrink-0">
        {m.full_name.charAt(0)}
      </div>
    )}

    <div className="flex-1 min-w-0">
      <div className="font-semibold truncate">{m.full_name}</div>
      {m.current_position && (
        <div className="text-xs text-gold mt-0.5 truncate">{m.current_position}</div>
      )}

      {canSeeContacts && (
        <>
          <a
            href={`mailto:${m.gmail}`}
            className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary truncate"
          >
            <Mail className="h-3 w-3 shrink-0" />
            {m.gmail}
          </a>
          <a
            href={`tel:${m.phone}`}
            className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
          >
            <Phone className="h-3 w-3 shrink-0" />
            {m.phone}
          </a>
        </>
      )}
    </div>
  </div>
);
