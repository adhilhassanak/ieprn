import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole =
  | "student"
  | "executive_member"
  | "coordinator"
  | "co_admin"
  | "admin"
  | "documentation_head"
  | "finance_head";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  community: string | null;
  approved: boolean;
  loading: boolean;
  isAdmin: boolean;
  isCoAdmin: boolean;
  isExecutive: boolean;
  isApprovedExecutive: boolean;
  isCoordinator: boolean;
  isDocumentationHead: boolean;
  isFinanceHead: boolean;
  isCommunityCoAdmin: (community?: string | null) => boolean;
  canManageCommunity: (community?: string | null) => boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [community, setCommunity] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAll = async (uid: string) => {
    const [{ data: rs }, { data: prof }, { data: regs }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("community").eq("user_id", uid).maybeSingle(),
      supabase.from("registrations").select("status").eq("user_id", uid).eq("status", "approved").limit(1),
    ]);
    setRoles((rs ?? []).map((r) => r.role as AppRole));
    setCommunity(prof?.community ?? null);
    setApproved((regs ?? []).length > 0);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadAll(s.user.id), 0);
      } else {
        setRoles([]);
        setCommunity(null);
        setApproved(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadAll(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setCommunity(null);
    setApproved(false);
  };

  const refreshRoles = async () => {
    if (user) await loadAll(user.id);
  };

  const isAdmin = roles.includes("admin");
  const isCoAdmin = roles.includes("co_admin") || isAdmin;
  const isExecutive = roles.includes("executive_member") || isCoAdmin;
  const isApprovedExecutive = (roles.includes("executive_member") && approved) || isCoAdmin;
  const isCoordinator = roles.includes("coordinator") || isExecutive;
  const isDocumentationHead = roles.includes("documentation_head") || isAdmin;
  const isFinanceHead = roles.includes("finance_head") || isAdmin;

  const normCommunity = (c?: string | null) =>
    String(c ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const isCommunityCoAdmin = (c?: string | null) => {
    if (isAdmin) return true;
    if (!roles.includes("co_admin")) return false;
    if (!c) return true;
    return normCommunity(community) === normCommunity(c);
  };
  const canManageCommunity = (c?: string | null) => isAdmin || isCommunityCoAdmin(c);

  return (
    <AuthContext.Provider
      value={{
        user, session, roles, community, approved, loading,
        isAdmin, isCoAdmin, isExecutive, isApprovedExecutive, isCoordinator,
        isDocumentationHead, isFinanceHead,
        isCommunityCoAdmin, canManageCommunity,
        signOut, refreshRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const FALLBACK_AUTH: AuthContextValue = {
  user: null,
  session: null,
  roles: [],
  community: null,
  approved: false,
  loading: true,
  isAdmin: false,
  isCoAdmin: false,
  isExecutive: false,
  isApprovedExecutive: false,
  isCoordinator: false,
  isDocumentationHead: false,
  isFinanceHead: false,
  isCommunityCoAdmin: () => false,
  canManageCommunity: () => false,
  signOut: async () => {},
  refreshRoles: async () => {},
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    if (import.meta.env.DEV) console.warn("useAuth used outside AuthProvider — returning fallback");
    return FALLBACK_AUTH;
  }
  return ctx;
}
