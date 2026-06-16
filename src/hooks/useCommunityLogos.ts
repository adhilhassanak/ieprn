import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type LogoMap = Record<string, string>;

let cache: LogoMap | null = null;
const listeners = new Set<(m: LogoMap) => void>();

async function fetchAll(): Promise<LogoMap> {
  const { data } = await supabase.from("community_logos").select("community, logo_url");
  const map: LogoMap = {};
  (data ?? []).forEach((r: any) => {
    if (r.logo_url) map[r.community.toLowerCase()] = r.logo_url;
  });
  cache = map;
  listeners.forEach((cb) => cb(map));
  return map;
}

export function useCommunityLogos() {
  const [logos, setLogos] = useState<LogoMap>(cache ?? {});

  useEffect(() => {
    listeners.add(setLogos);
    if (!cache) fetchAll();
    else setLogos(cache);
    return () => {
      listeners.delete(setLogos);
    };
  }, []);

  return { logos, refresh: fetchAll };
}

export function getLogoFor(logos: LogoMap, communityShortOrKey: string | null | undefined) {
  if (!communityShortOrKey) return undefined;
  return logos[communityShortOrKey.toLowerCase()];
}
