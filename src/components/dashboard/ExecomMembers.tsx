import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type Member = {
  id: string;
  full_name: string;
  community: string;
  current_position: string | null;
  photo_url: string | null;
  gmail: string;
  phone: string;
};

// Tier classification — lower number = higher in hierarchy
const TIER = {
  LEAD: 1,
  SUB_LEAD: 2,
  CHAIR: 3,
  VICE_CHAIR: 4,
  HEAD: 5,
  SUB: 6,
  OTHER: 7,
} as const;

const TIER_LABEL: Record<number, string> = {
  [TIER.LEAD]: "Leads",
  [TIER.SUB_LEAD]: "Sub-Leads",
  [TIER.CHAIR]: "Chairs",
  [TIER.VICE_CHAIR]: "Vice Chairs",
  [TIER.HEAD]: "Heads",
  [TIER.SUB]: "Sub Members",
  [TIER.OTHER]: "Other Members",
};

// Preferred order of Head titles (first ones float to the top of the Heads section)
const HEAD_ORDER = [
  "documentation head",
  "design head",
  "finance head",
  "social media head",
  "event head",
  "online event head",
  "offline event head",
  "technical head",
];

const classify = (pos: string | null): number => {
  if (!pos) return TIER.OTHER;
  const p = pos.toLowerCase();
  if (p.includes("sub lead") || p.includes("sub-lead")) return TIER.SUB_LEAD;
  if (p.includes("lead")) return TIER.LEAD;
  if (p.includes("vice chair")) return TIER.VICE_CHAIR;
  if (p.includes("chair")) return TIER.CHAIR;
  if (p.includes("head")) return TIER.HEAD;
  if (p.includes("sub")) return TIER.SUB;
  return TIER.OTHER;
};

const headRank = (pos: string | null) => {
  const p = (pos ?? "").toLowerCase().trim();
  const idx = HEAD_ORDER.findIndex((h) => p === h || p.includes(h));
  return idx === -1 ? HEAD_ORDER.length : idx;
};

export const ExecomMembers = () => {
  const { community, isAdmin } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    (async () => {
      let q = (supabase as any)
        .from("execom_sorted")
        .select("id, full_name, community, current_position, photo_url, gmail, phone");

      if (!isAdmin && community) q = q.eq("community", community);

      const { data, error } = await q;
      if (error) {
        console.error("Error fetching execom:", error);
        return;
      }
      setMembers((data ?? []) as Member[]);
    })();
  }, [community, isAdmin]);

  // Group: community -> tier -> members
  const tree = useMemo(() => {
    const byCommunity: Record<string, Record<number, Member[]>> = {};
    for (const m of members) {
      const c = m.community ?? "Other";
      const t = classify(m.current_position);
      byCommunity[c] ??= {};
      byCommunity[c][t] ??= [];
      byCommunity[c][t].push(m);
    }
    // Sort heads tier by HEAD_ORDER
    for (const c of Object.keys(byCommunity)) {
      const heads = byCommunity[c][TIER.HEAD];
      if (heads) {
        heads.sort((a, b) => {
          const r = headRank(a.current_position) - headRank(b.current_position);
          return r !== 0 ? r : a.full_name.localeCompare(b.full_name);
        });
      }
      // Other tiers: alphabetical
      for (const t of Object.keys(byCommunity[c])) {
        if (Number(t) === TIER.HEAD) continue;
        byCommunity[c][Number(t)].sort((a, b) => a.full_name.localeCompare(b.full_name));
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

  const communities = Object.keys(tree).sort();
  const tierOrder = [
    TIER.LEAD,
    TIER.SUB_LEAD,
    TIER.CHAIR,
    TIER.VICE_CHAIR,
    TIER.HEAD,
    TIER.SUB,
    TIER.OTHER,
  ];

  return (
    <div className="space-y-6">
      {communities.map((c) => (
        <CommunityBlock
          key={c}
          community={c}
          groups={tree[c]}
          tierOrder={tierOrder}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
};

const CommunityBlock = ({
  community,
  groups,
  tierOrder,
  isAdmin,
}: {
  community: string;
  groups: Record<number, Member[]>;
  tierOrder: number[];
  isAdmin: boolean;
}) => {
  const total = Object.values(groups).reduce((s, arr) => s + arr.length, 0);
  return (
    <Collapsible defaultOpen>
      <div className="glass-strong rounded-2xl overflow-hidden">
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/30">
          <div className="flex items-center gap-3">
            <Badge className="bg-gradient-emerald text-primary-foreground">{community}</Badge>
            <span className="text-sm text-muted-foreground">{total} members</span>
          </div>
          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=closed]:-rotate-90" />
        </CollapsibleTrigger>

        <CollapsibleContent className="px-4 pb-4 space-y-4">
          {tierOrder.map((tier) => {
            const list = groups[tier];
            if (!list || list.length === 0) return null;
            return (
              <TierGroup
                key={tier}
                label={TIER_LABEL[tier]}
                members={list}
                isAdmin={isAdmin}
                isHead={tier === TIER.HEAD}
              />
            );
          })}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

const TierGroup = ({
  label,
  members,
  isAdmin,
  isHead,
}: {
  label: string;
  members: Member[];
  isAdmin: boolean;
  isHead?: boolean;
}) => {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="w-full flex items-center gap-2 text-left text-xs uppercase tracking-widest text-gold py-2">
        <ChevronRight className="h-3 w-3" />
        {label}
        <span className="text-muted-foreground normal-case tracking-normal">({members.length})</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {isHead ? (
          <div className="space-y-3 pl-2 border-l border-border/60 ml-1">
            {members.map((m) => (
              <HeadWithSubs key={m.id} head={m} isAdmin={isAdmin} />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 pl-2">
            {members.map((m) => (
              <MemberCard key={m.id} m={m} isAdmin={isAdmin} />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

// Renders a Head with its matching "subs" nested visually beneath it.
// Subs are detected by name overlap: e.g. "Documentation Head" -> "Documentation Sub".
const HeadWithSubs = ({ head, isAdmin }: { head: Member; isAdmin: boolean }) => {
  return (
    <div>
      <MemberCard m={head} isAdmin={isAdmin} highlight />
    </div>
  );
};

const MemberCard = ({
  m,
  isAdmin,
  highlight,
}: {
  m: Member;
  isAdmin: boolean;
  highlight?: boolean;
}) => {
  return (
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

        {isAdmin && (
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
};
