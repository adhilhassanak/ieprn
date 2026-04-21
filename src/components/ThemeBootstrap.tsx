import { useAdminSettings } from "@/hooks/useAdminSettings";

/** Mounts once at app root to fetch + apply admin-controlled theme tokens. */
export const ThemeBootstrap = () => {
  useAdminSettings();
  return null;
};
