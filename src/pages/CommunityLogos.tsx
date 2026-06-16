import { useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { COMMUNITY_LIST, CommunityKey } from "@/lib/communities";
import { useCommunityLogos, getLogoFor } from "@/hooks/useCommunityLogos";
import { Upload, Trash2, RefreshCw, ImageOff } from "lucide-react";
import { CommunityLogo } from "@/components/CommunityLogo";

const MAX = 300 * 1024; // 300 KB
const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

const CommunityLogos = () => {
  const { isAdmin, loading } = useAuth();
  const { logos, refresh } = useCommunityLogos();

  const [busy, setBusy] = useState<string | null>(null);

  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  if (!loading && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const upload = async (communityKey: CommunityKey, file: File) => {
    if (!ALLOWED.includes(file.type)) {
      return toast({
        title: "Invalid file",
        description: "Use PNG, JPG, JPEG or WEBP.",
        variant: "destructive",
      });
    }

    if (file.size > MAX) {
      return toast({
        title: "Too large",
        description: "Maximum size is 300 KB.",
        variant: "destructive",
      });
    }

    setBusy(communityKey);

    try {
      const ext = file.name.split(".").pop() || "png";

      // Use database key directly
      const path = `community-logos/${communityKey}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("highlights")
        .upload(path, file, { upsert: true });

      if (upErr) throw upErr;

      const url = supabase.storage
        .from("highlights")
        .getPublicUrl(path).data.publicUrl;

      const { error: dbErr } = await supabase
        .from("community_logos")
        .upsert(
          {
            community: communityKey,
            logo_url: url,
          },
          {
            onConflict: "community",
          }
        );

      if (dbErr) throw dbErr;

      toast({
        title: `${communityKey} logo updated`,
      });

      await refresh();
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (communityKey: CommunityKey) => {
    if (!confirm(`Remove ${communityKey} logo?`)) return;

    setBusy(communityKey);

    try {
      const { error } = await supabase
        .from("community_logos")
        .upsert(
          {
            community: communityKey,
            logo_url: null,
          },
          {
            onConflict: "community",
          }
        );

      if (error) throw error;

      toast({
        title: "Removed",
      });

      await refresh();
    } catch (e: any) {
      toast({
        title: "Failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Layout>
      <div className="container py-10 max-w-5xl">
        <BackButton />

        <h1 className="text-3xl font-bold">
          Community Logo Management
        </h1>

        <p className="text-muted-foreground mt-1 text-sm">
          PNG / JPG / JPEG / WEBP · Max 300 KB · One active logo per
          community.
        </p>

        <div className="grid gap-5 mt-8 md:grid-cols-2">
          {COMMUNITY_LIST.map((c) => {
            const url = getLogoFor(logos, c.key);
            const isBusy = busy === c.key;

            return (
              <div
                key={c.key}
                className="glass-strong rounded-2xl p-6"
              >
                <div className="flex items-center gap-3">
                  <CommunityLogo community={c.key} size={48} />

                  <div>
                    <h3 className="font-semibold text-lg">
                      {c.short}
                    </h3>

                    <p className="text-xs text-muted-foreground">
                      {c.name}
                    </p>
                  </div>
                </div>

                <div className="mt-5 aspect-video rounded-xl border border-border/60 bg-background/40 grid place-items-center overflow-hidden">
                  {url ? (
                    <img
                      src={url}
                      alt={`${c.short} logo`}
                      className="max-h-full max-w-full object-contain p-4"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
                      <ImageOff className="h-8 w-8" />
                      <span>No logo uploaded</span>
                    </div>
                  )}
                </div>

                <input
                  ref={(el) => {
                    inputs.current[c.key] = el;
                  }}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];

                    if (f) {
                      upload(c.key, f);
                    }

                    e.target.value = "";
                  }}
                />

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={isBusy}
                    onClick={() => inputs.current[c.key]?.click()}
                    className="bg-gradient-emerald text-primary-foreground"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    {url ? "Replace" : "Upload"}
                  </Button>

                  {url && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() =>
                          inputs.current[c.key]?.click()
                        }
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Change
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isBusy}
                        onClick={() => remove(c.key)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default CommunityLogos;
