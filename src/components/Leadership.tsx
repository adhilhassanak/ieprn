import { useFaculty, usePrincipal } from "@/hooks/useFaculty";
import { Mail, Phone, UserCircle2 } from "lucide-react";

/**
 * Unified Leadership block — renders Principal first, then Faculty cards
 * ordered by priority. Execom members are rendered separately via PublicExecom.
 */
export const Leadership = () => {
  const { principal } = usePrincipal();
  const { faculty } = useFaculty(true);

  if (!principal && faculty.length === 0) return null;

  return (
    <section id="leadership" className="py-16">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl md:text-4xl font-bold">
            Our <span className="text-gradient-gold">Leadership</span>
          </h2>
          <p className="mt-2 text-muted-foreground">Principal &middot; Faculty Leads &middot; Faculty Coordinators</p>
        </div>

        {principal && (
          <div className="max-w-xl mx-auto mb-10">
            <div className="glass-strong rounded-2xl p-6 text-center shadow-elevated border border-gold/30">
              {principal.photo_url ? (
                <img src={principal.photo_url} alt={principal.name} className="h-28 w-28 rounded-full object-cover mx-auto ring-2 ring-gold/40" />
              ) : (
                <div className="h-28 w-28 rounded-full bg-secondary grid place-items-center mx-auto"><UserCircle2 className="h-14 w-14 text-muted-foreground" /></div>
              )}
              <div className="mt-4 text-xl font-semibold">{principal.name}</div>
              <div className="text-sm text-gold mt-1">{principal.designation ?? "Principal"}</div>
              <div className="mt-3 flex flex-col items-center gap-1 text-xs text-muted-foreground">
                {principal.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3 text-primary" />{principal.email}</span>}
                {principal.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3 text-primary" />{principal.phone}</span>}
              </div>
            </div>
          </div>
        )}

        {faculty.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {faculty.map((f) => (
              <div key={f.id} className="glass rounded-xl p-4 hover:border-primary/40 transition-smooth">
                <div className="flex items-center gap-3">
                  {f.photo_url ? (
                    <img src={f.photo_url} alt={f.name} loading="lazy" className="h-14 w-14 rounded-lg object-cover" />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-secondary grid place-items-center"><UserCircle2 className="h-7 w-7 text-muted-foreground" /></div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate">{f.name}</div>
                    {f.designation && <div className="text-xs text-gold truncate">{f.designation}</div>}
                    {f.department && <div className="text-[11px] text-muted-foreground truncate">{f.department}</div>}
                  </div>
                </div>
                {(f.email || f.phone) && (
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {f.email && <div className="flex items-center gap-2 truncate"><Mail className="h-3 w-3 text-primary" />{f.email}</div>}
                    {f.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-primary" />{f.phone}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
