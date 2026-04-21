import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { COMMUNITY_LIST } from "@/lib/communities";
import { Sparkles, Rocket, Users, Calendar, ArrowRight, Instagram, Facebook, Linkedin, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { HighlightsGrid } from "@/components/HighlightsGrid";
import { PublicExecom } from "@/components/PublicExecom";

type Stat = { label: string; value: number | null; icon: any; suffix?: string; dynamic?: "events" };
const stats: Stat[] = [
  { label: "Communities", value: 3, icon: Users },
  { label: "Active Events", value: null, icon: Calendar, dynamic: "events" },
  { label: "Innovation", value: 100, suffix: "%", icon: Rocket },
];

const Index = () => {
  const [eventCount, setEventCount] = useState<number>(0);
  const [publishedEvents, setPublishedEvents] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .in("status", ["published", "completed"])
        .order("event_date", { ascending: false })
        .limit(6);
      setPublishedEvents(data ?? []);
      setEventCount(data?.length ?? 0);
    })();
  }, []);

  return (
    <Layout>
      <AnnouncementBanner />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="container pt-16 pb-12 md:pt-24 md:pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs text-primary mb-6"
          >
            <Sparkles className="h-3.5 w-3.5" />
            College of Engineering Perumon
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight"
          >
            Innovation &{" "}
            <span className="text-gradient-gold">Entrepreneurship</span>
            <br />
            <span className="text-gradient-emerald">Community Portal</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 max-w-2xl mx-auto text-base md:text-lg text-muted-foreground"
          >
            One home for IIC, E-Cell, and ED Club — apply to executive teams, host events, and grow with a community of builders.
          </motion.p>
        </div>
      </section>

      {/* EVENTS — first priority */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold">Upcoming & Past <span className="text-gradient-gold">Events</span></h2>
              <p className="mt-2 text-muted-foreground">Join an event, learn, build, and connect.</p>
            </div>
            <Button asChild variant="ghost" className="hidden md:inline-flex">
              <Link to="/gallery">View gallery <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          {publishedEvents.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
              No published events yet. Check back soon!
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {publishedEvents.map((e, i) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="group glass rounded-xl overflow-hidden hover:border-gold/40 hover:shadow-glow-gold transition-smooth flex flex-col"
                >
                  {e.poster_url ? (
                    <Link to={`/events/${e.id}`} className="block aspect-[4/3] overflow-hidden bg-secondary">
                      <img src={e.poster_url} alt={e.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </Link>
                  ) : (
                    <Link to={`/events/${e.id}`} className="block aspect-[4/3] bg-gradient-emerald grid place-items-center text-primary-foreground">
                      <Calendar className="h-10 w-10 opacity-70" />
                    </Link>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 text-xs text-gold uppercase tracking-wide">
                      <Calendar className="h-3 w-3" />{e.community}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">{e.name}</h3>
                    {e.event_date && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        {new Date(e.event_date).toLocaleDateString()}
                        {e.venue && <> · <MapPin className="h-3 w-3" /> {e.venue}</>}
                      </p>
                    )}
                    <Button asChild className="mt-4 bg-gradient-emerald text-primary-foreground shadow-glow-emerald">
                      <Link to={`/events/${e.id}`}>Register / View <ArrowRight className="ml-1 h-3 w-3" /></Link>
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* STATS + CTA */}
      <section className="py-12">
        <div className="container">
          <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-3xl mx-auto">
            {stats.map((s, i) => {
              const Icon = s.icon;
              const value = s.dynamic === "events" ? eventCount : s.value;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass rounded-2xl p-4 md:p-6 text-center"
                >
                  <Icon className="h-5 w-5 text-primary mx-auto mb-2" />
                  <div className="text-2xl md:text-4xl font-bold text-gradient-gold">
                    {value}{s.suffix ?? ""}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground mt-1">{s.label}</div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-emerald text-primary-foreground shadow-glow-emerald hover:scale-105 transition-smooth">
              <Link to="/auth?mode=signup">Join the community <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-gold/40 hover:border-gold hover:text-gold">
              <a href="#communities">Explore communities</a>
            </Button>
          </div>
        </div>
      </section>

      {/* COMMUNITIES */}
      <section id="communities" className="py-16">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-5xl font-bold">Three communities. <span className="text-gradient-emerald">One mission.</span></h2>
            <p className="mt-4 text-muted-foreground">Pick the community that matches your spark.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {COMMUNITY_LIST.map((c, i) => (
              <motion.div
                key={c.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group glass rounded-2xl p-6 hover:border-primary/50 hover:shadow-glow-emerald transition-smooth"
              >
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-xl bg-gradient-emerald grid place-items-center font-bold text-primary-foreground shadow-glow-emerald">
                    {c.short.charAt(0)}
                  </div>
                  <div className="flex gap-2">
                    {c.social.instagram && <a href={c.social.instagram} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-smooth"><Instagram className="h-4 w-4" /></a>}
                    {c.social.facebook && <a href={c.social.facebook} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-smooth"><Facebook className="h-4 w-4" /></a>}
                    {c.social.linkedin && <a href={c.social.linkedin} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-smooth"><Linkedin className="h-4 w-4" /></a>}
                  </div>
                </div>
                <h3 className="mt-5 text-xl font-semibold">{c.short}</h3>
                <p className="text-sm text-muted-foreground">{c.name}</p>
                <p className="mt-3 text-sm">{c.tagline}</p>
                <Button asChild variant="ghost" className="mt-5 -ml-3 group-hover:text-primary">
                  <Link to={`/register/${c.key}`}>Apply for ExeCom <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PUBLIC EXECOM */}
      <PublicExecom />

      {/* HIGHLIGHTS */}
      <HighlightsGrid />

      {/* FOLLOW US */}
      <section className="py-16">
        <div className="container">
          <div className="glass-strong rounded-3xl p-10 md:p-14 text-center">
            <h2 className="text-2xl md:text-4xl font-bold">Follow our <span className="text-gradient-emerald">communities</span></h2>
            <p className="mt-3 text-muted-foreground">Stay in the loop with events, opportunities, and announcements.</p>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {COMMUNITY_LIST.map((c) => (
                <div key={c.key} className="flex flex-col items-center gap-3">
                  <div className="text-sm font-semibold">{c.short}</div>
                  <div className="flex gap-3">
                    {c.social.instagram && (
                      <a href={c.social.instagram} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full border border-border hover:border-primary hover:text-primary hover:scale-110 hover:shadow-glow-emerald transition-smooth"><Instagram className="h-4 w-4" /></a>
                    )}
                    {c.social.facebook && (
                      <a href={c.social.facebook} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full border border-border hover:border-primary hover:text-primary hover:scale-110 hover:shadow-glow-emerald transition-smooth"><Facebook className="h-4 w-4" /></a>
                    )}
                    {c.social.linkedin && (
                      <a href={c.social.linkedin} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full border border-border hover:border-primary hover:text-primary hover:scale-110 hover:shadow-glow-emerald transition-smooth"><Linkedin className="h-4 w-4" /></a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
