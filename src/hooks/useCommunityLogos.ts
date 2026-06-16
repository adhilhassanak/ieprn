import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { findCommunityByShortOrKey } from "@/lib/communities";

type LogoMap = Record<string, string>;

let cache: LogoMap | null = null;

const listeners = new Set<(m: LogoMap) => void>();

async function fetchAll(): Promise<LogoMap> {
  const { data, error } = await supabase
    .from("community_logos")
    .select("community, logo_url");

  if (error) {
    console.error("Failed to fetch community logos:", error);
    return cache ?? {};
  }

  const map: LogoMap = {};

  (data ?? []).forEach((row: any) => {
    if (row.logo_url) {
      // Store by database key
      map[row.community.toLowerCase()] = row.logo_url;
    }
  });

  cache = map;

  listeners.forEach((cb) => cb(map));

  return map;
}

export function useCommunityLogos() {
  const [logos, setLogos] = useState<LogoMap>(cache ?? {});

  useEffect(() => {
    listeners.add(setLogos);

    if (!cache) {
      fetchAll();
    } else {
      setLogos(cache);
    }

    return () => {
      listeners.delete(setLogos);
    };
  }, []);

  return {
    logos,
    refresh: fetchAll,
  };
}

export function getLogoFor(
  logos: LogoMap,
  community: string | null | undefined
) {
  if (!community) return undefined;

  // Direct lookup by key
  const direct = logos[community.toLowerCase()];

  if (direct) {
    return direct;
  }

  // Convert short names to keys
  const meta = findCommunityByShortOrKey(community);

  if (meta) {
    return logos[meta.key.toLowerCase()];
  }

  return undefined;
}
