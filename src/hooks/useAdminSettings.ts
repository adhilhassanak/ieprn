import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminSettings {
  id: string;
  primary_color: string;
  accent_color: string;
  registration_open_global: boolean;
  theme_mode?: "light" | "dark";
}

export const applyThemeMode = (mode: "light" | "dark") => {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(mode);
};

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

export const THEME_PRESETS = {
  navy:    { primary: "#1d4ed8", accent: "#f5c542", label: "Navy" },
  royal:   { primary: "#2563eb", accent: "#60a5fa", label: "Royal Blue" },
  gold:    { primary: "#b8860b", accent: "#facc15", label: "Royal Gold" },
} as const;
export type ThemePresetKey = keyof typeof THEME_PRESETS;

export const applyGlass = (alpha: number, blurPx: number) => {
  const root = document.documentElement;
  root.style.setProperty("--glass-alpha", String(alpha));
  root.style.setProperty("--glass-blur", `${blurPx}px`);
};

export const loadGlassPrefs = () => {
  const a = parseFloat(localStorage.getItem("glassAlpha") || "0.55");
  const b = parseInt(localStorage.getItem("glassBlur") || "16", 10);
  return { alpha: isNaN(a) ? 0.55 : a, blur: isNaN(b) ? 16 : b };
};

export const saveGlassPrefs = (alpha: number, blur: number) => {
  localStorage.setItem("glassAlpha", String(alpha));
  localStorage.setItem("glassBlur", String(blur));
  applyGlass(alpha, blur);
};

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);

  const load = async () => {
    const { alpha, blur } = loadGlassPrefs();
    applyGlass(alpha, blur);
    const { data } = await supabase.from("admin_settings").select("*").limit(1).maybeSingle();
    if (data) {
      setSettings(data as AdminSettings);
      applyTheme(data.primary_color, data.accent_color);
    }
  };

  useEffect(() => { load(); }, []);

  return { settings, reload: load };
}
