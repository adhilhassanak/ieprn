export type CommunityKey = string;

export interface Community {
  key: CommunityKey;
  name: string;
  short: string;
  tagline: string;
  accent: "emerald" | "gold" | "violet" | "purple";
  social: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
}

export const COMMUNITIES: Record<string, Community> = {
  iic: {
    key: "iic",
    name: "Institution's Innovation Council",
    short: "IIC",
    tagline: "Driving innovation across the institution",
    accent: "emerald",
    social: {
      instagram: "https://www.instagram.com/iic_cep?igsh=MmdsZDQzaDd6ZXRq",
      facebook: "https://www.facebook.com/share/18R3Q4SiBU/",
      linkedin: "https://www.linkedin.com/company/iic-ce-perumon/",
    },
  },
  ecell: {
    key: "ecell",
    name: "Entrepreneurship Cell",
    short: "E-Cell",
    tagline: "Building the next generation of founders",
    accent: "gold",
    social: {
      instagram: "https://www.instagram.com/cep.ecell?igsh=MXBhd3h4YWlsMzcyaQ==",
      linkedin: "https://www.linkedin.com/company/e-cell-college-of-engineering-perumon/",
    },
  },
  edclub: {
    key: "edclub",
    name: "Entrepreneurship Development Club",
    short: "ED Club",
    tagline: "Nurturing entrepreneurial mindsets",
    accent: "violet",
    social: {
      instagram: "https://www.instagram.com/ed_cep?igsh=MXU5MnlxZXRpOTE2eQ==",
      linkedin: "https://www.linkedin.com/company/edclubcep/",
    },
  },
  rndclub: {
    key: "rndclub",
    name: "Research & Development Club",
    short: "R&D",
    tagline: "Research, innovation, publications and emerging technologies",
    accent: "purple",
    social: {},
  },
};

export const COMMUNITY_LIST = Object.values(COMMUNITIES);

export function getCommunity(key: string | undefined): Community | undefined {
  if (!key) return undefined;
  return COMMUNITIES[key as CommunityKey];
}

/** Match either short ("IIC") or key ("iic") used across tables. */
export function findCommunityByShortOrKey(value: string | null | undefined): Community | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  return COMMUNITY_LIST.find((c) => c.short.toLowerCase() === v || c.key.toLowerCase() === v);
}

const ACCENTS = ["emerald", "gold", "violet", "purple"] as const;

/** Load admin-added communities from the database and merge them into the lists above. */
export async function loadCustomCommunities(): Promise<void> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.from("custom_communities").select("*").order("created_at");
    for (const r of data ?? []) {
      const c: Community = {
        key: r.key,
        name: r.name,
        short: r.short,
        tagline: r.tagline ?? "",
        accent: (ACCENTS as readonly string[]).includes(r.accent) ? (r.accent as Community["accent"]) : "emerald",
        social: { instagram: r.instagram ?? undefined, facebook: r.facebook ?? undefined, linkedin: r.linkedin ?? undefined },
      };
      if (!COMMUNITIES[c.key]) COMMUNITY_LIST.push(c);
      else Object.assign(COMMUNITY_LIST.find((x) => x.key === c.key)!, c);
      COMMUNITIES[c.key] = c;
    }
  } catch (e) {
    console.warn("Could not load custom communities", e);
  }
}
