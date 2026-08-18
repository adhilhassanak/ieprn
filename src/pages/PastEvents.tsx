import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CommunityLogo } from "@/components/CommunityLogo";
import { COMMUNITY_LIST } from "@/lib/communities";
import { Calendar, MapPin, ArrowRight, Search } from "lucide-react";

type EventRow = {
  id: string;
  slug: string | null;
  name: string;
  community: string;
  event_date: string | null;
  venue: string | null;
  poster_url: string | null;
  status: string;
  collaborators: string[] | null;
};

const PastEvents = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [q, setQ] = useState("");
  const [community, setCommunity] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id, slug, name, community, event_date, venue, poster_url, status, collaborators")
        .in("status", ["published", "completed"])
        .order("event_date", { ascending: false });
      setEvents((data ?? []) as EventRow[]);
    })();
  }, []);

  const past = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events.filter((e) => e.status === "completed" || (e.event_date && new Date(e.event_date) < today));
  }, [events]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return past.filter(
      (e) =>
        (community === "all" || e.community === community) &&
        (!term || e.name.toLowerCase().includes(term) || (e.venue ?? "").toLowerCase().includes(term)),
    );
  }, [past, q, community]);

  return (
    <Layout>
      <div className="container py-10">
        <BackButton />
        <h1 className="mt-2 text-3xl md:text-4xl font-bold">
          All <span className="text-gradient-gold">Past Events</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every completed session across our communities — {past.length} in total.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input placeholder="Search past events" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCommunity("all")}
              className={`px-3 py-1.5 rounded-full text-xs border transition-smooth ${
                community === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/60"
              }`}
            >
              All
            </button>
            {COMMUNITY_LIST.map((c) => (
              <button
                key={c.key}
                onClick={() => setCommunity(c.short)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-smooth ${
                  community === c.short ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/60"
                }`}
              >
                {c.short}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-10 mt-8 text-center text-muted-foreground text-sm">
            No past events found.
          </div>
        ) : (
          <div className="grid gap-4 mt-8 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i, 8) * 0.04 }}
                className="group glass rounded-xl overflow-hidden hover:border-gold/40 hover:shadow-glow-gold transition-smooth flex flex-col"
              >
                <Link to={`/events/${e.slug ?? e.id}`} className="block aspect-[4/3] overflow-hidden bg-secondary">
                  {e.poster_url ? (
                    <img
                      src={e.poster_url}
                      alt={`${e.name} poster`}
                      loading="lazy"
                      className="h-full w-full object-cover grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-emerald grid place-items-center text-primary-foreground">
                      <Calendar className="h-10 w-10 opacity-70" />
                    </div>
                  )}
                </Link>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-gold uppercase tracking-wide">
                    <CommunityLogo community={e.community} size={18} />
                    {e.community}
                  </div>
                  {e.collaborators && e.collaborators.length > 0 && (
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      with {e.collaborators.join(", ")}
                    </div>
                  )}
                  <h2 className="mt-2 text-base font-semibold line-clamp-2">{e.name}</h2>
                  {e.event_date && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      {new Date(e.event_date).toLocaleDateString()}
                      {e.venue && <> · <MapPin className="h-3 w-3" /> {e.venue}</>}
                    </p>
                  )}
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <Link to={`/events/${e.slug ?? e.id}`}>
                      View event <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PastEvents;
