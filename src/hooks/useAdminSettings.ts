import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminSettings {
  id: string;
  primary_color: string;
  accent_color: string;
  registration_open_global: boolean;
}

const hexToHsl = (hex: string): string => {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16) / 255;
  const g = parseInt(m.substring(2, 4), 16) / 255;
  const b = parseInt(m.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export const applyTheme = (primaryHex: string, accentHex: string) => {
  const root = document.documentElement;
  root.style.setProperty("--primary", hexToHsl(primaryHex));
  root.style.setProperty("--ring", hexToHsl(primaryHex));
  root.style.setProperty("--gold", hexToHsl(accentHex));
};

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);

  const load = async () => {
    const { data } = await supabase.from("admin_settings").select("*").limit(1).maybeSingle();
    if (data) {
      setSettings(data as AdminSettings);
      applyTheme(data.primary_color, data.accent_color);
    }
  };

  useEffect(() => { load(); }, []);

  return { settings, reload: load };
}
