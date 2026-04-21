import { Instagram, Facebook, Linkedin, Mail } from "lucide-react";
import { COMMUNITY_LIST } from "@/lib/communities";

const socialIcon = (k: "instagram" | "facebook" | "linkedin") => {
  if (k === "instagram") return Instagram;
  if (k === "facebook") return Facebook;
  return Linkedin;
};

export const Footer = () => {
  return (
    <footer className="mt-24 border-t border-border/50 glass">
      <div className="container py-12 grid gap-10 md:grid-cols-4">
        <div>
          <h3 className="text-lg font-semibold text-gradient-gold">I&E Community Portal</h3>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Empowering students through innovation, entrepreneurship, and community-driven events at the College of Engineering Perumon.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Communities</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {COMMUNITY_LIST.map((c) => (
              <li key={c.key} className="hover:text-primary transition-smooth">{c.short} — {c.name}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Follow Us</h4>
          <div className="space-y-3">
            {COMMUNITY_LIST.map((c) => (
              <div key={c.key} className="flex items-center gap-3">
                <span className="text-xs w-14 text-muted-foreground">{c.short}</span>
                <div className="flex items-center gap-2">
                  {(["instagram", "facebook", "linkedin"] as const).map((k) => {
                    const url = c.social[k];
                    if (!url) return null;
                    const Icon = socialIcon(k);
                    return (
                      <a
                        key={k}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${c.short} on ${k}`}
                        className="grid h-8 w-8 place-items-center rounded-md border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/60 hover:scale-110 hover:shadow-glow-emerald transition-smooth"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Faculty Coordinator</h4>
          <p className="text-sm text-muted-foreground">Ms Beenu Mary</p>
          <p className="text-xs text-muted-foreground mt-1">Asst. Professor, EEE Dept</p>
          <a href="mailto:" className="mt-3 inline-flex items-center gap-2 text-xs text-primary hover:text-primary-glow transition-smooth">
            <Mail className="h-3 w-3" /> Contact
          </a>
        </div>
      </div>
      <div className="border-t border-border/40">
        <div className="container py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} College of Engineering Perumon · I&E Community Portal
        </div>
      </div>
    </footer>
  );
};
