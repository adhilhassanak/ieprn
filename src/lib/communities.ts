export type CommunityKey = "iic" | "ecell" | "edclub";

export interface Community {
  key: CommunityKey;
  name: string;
  short: string;
  tagline: string;
  accent: "emerald" | "gold" | "violet";
  social: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
}

export const COMMUNITIES: Record<CommunityKey, Community> = {
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
};

export const COMMUNITY_LIST = Object.values(COMMUNITIES);

export function getCommunity(key: string | undefined): Community | undefined {
  if (!key) return undefined;
  return COMMUNITIES[key as CommunityKey];
}
