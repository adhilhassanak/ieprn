import { Sparkles } from "lucide-react";
import { useCommunityLogos, getLogoFor } from "@/hooks/useCommunityLogos";
import { findCommunityByShortOrKey } from "@/lib/communities";

interface Props {
  community: string | null | undefined;
  size?: number;
  className?: string;
  showName?: boolean;
}

const accentBg: Record<string, string> = {
  emerald: "bg-gradient-emerald",
  gold: "bg-gradient-gold",
  violet: "bg-gradient-to-br from-violet-500 to-fuchsia-600",
  purple: "bg-gradient-to-br from-purple-700 via-purple-600 to-amber-500",
};

export const CommunityLogo = ({ community, size = 28, className = "", showName = false }: Props) => {
  const { logos } = useCommunityLogos();
  const url = getLogoFor(logos, community);
  const meta = findCommunityByShortOrKey(community ?? undefined);
  const accent = meta?.accent ?? "emerald";
  const label = meta?.short ?? community ?? "?";

  const dim = { width: size, height: size };

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {url ? (
        <img
          src={url}
          alt={`${label} logo`}
          loading="lazy"
          style={dim}
          className="rounded-md object-contain bg-background/30 border border-border/40 p-0.5"
        />
      ) : (
        <span
          style={dim}
          className={`rounded-md grid place-items-center text-primary-foreground shadow-sm ${accentBg[accent]}`}
          aria-hidden
        >
          <Sparkles className="h-3.5 w-3.5" />
        </span>
      )}
      {showName && <span className="text-sm font-medium">{label}</span>}
    </span>
  );
};
