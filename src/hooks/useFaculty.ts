import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Faculty = {
  id: string;
  name: string;
  department: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  priority: number;
  active: boolean;
};

export type Principal = {
  id: string;
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
};

export const useFaculty = (onlyActive = true) => {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (onlyActive) {
      // Public listing: excludes personal contact details (email/phone)
      const { data } = await supabase.rpc("get_public_faculty");
      setFaculty(((data ?? []) as any[]).map((f) => ({ ...f, email: null, phone: null })) as Faculty[]);
    } else {
      const { data } = await supabase
        .from("faculty")
        .select("*")
        .order("priority", { ascending: true })
        .order("name");
      setFaculty((data ?? []) as Faculty[]);
    }
    setLoading(false);
  }, [onlyActive]);

  useEffect(() => { load(); }, [load]);
  return { faculty, loading, reload: load };
};

export const usePrincipal = () => {
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("principal").select("*").order("created_at", { ascending: true }).limit(1).maybeSingle();
    setPrincipal((data ?? null) as Principal | null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { principal, loading, reload: load };
};
