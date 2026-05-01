import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { COMMUNITY_LIST } from "@/lib/communities";
import {
  Sparkles,
  Rocket,
  Users,
  Calendar,
  ArrowRight,
  Instagram,
  Facebook,
  Linkedin,
  MapPin,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { HighlightsGrid } from "@/components/HighlightsGrid";

type EventRow = {
  id: string;
  name: string;
  community: string;
  event_date: string | null;
  venue: string | null;
  poster_url: string | null;
  status: string;
};

type Member = {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  community: string;
  position: string | null;
};

type Stat = {
  label: string;
  value: number | null;
  icon: any;
  suffix?: string;
  dynamic?: "events";
};

const stats: Stat[] = [
  { label: "Communities", value: 3, icon: Users },
  { label: "Active Events", value: null, icon: Calendar, dynamic: "events" },
  { label: "Innovation", value: 100, suffix: "%", icon: Rocket },
];

const EventCard = ({
  e,
  faded = false,
  i = 0,
}: {
  e: EventRow;
  faded?: boolean;
  i?: number;
}) => (
  <motion.div
    key={e.id}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: i * 0.05 }}
    className={`group glass rounded-xl overflow-hidden hover:border-gold/40 hover:shadow-glow-gold transition-smooth flex flex-col ${
      faded ? "opacity-80 hover:opacity-100" : ""
    }`}
  >
    {e.poster_url ? (
      <Link to={`/events/${e.id}`} className="block aspect-[4/3] overflow-hidden">
        <img
          src={e.poster_url}
          alt={e.name}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </Link>
    ) : (
      <div className="aspect-[4/3] grid place-items-center bg-secondary">
        <Calendar className="h-10 w-10 opacity-60" />
      </div>
    )}

    <div className="p-4 flex-1 flex flex-col">
      <div className="text-xs text-gold">{e.community}</div>
      <h3 className="mt-1 font-semibold">{e.name}</h3>

      {e.event_date && (
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          {new Date(e.event_date).toLocaleDateString()}
          {e.venue && <> · {e.venue}</>}
        </p>
      )}

      <Button asChild size="sm" className="mt-3">
        <Link to={`/events/${e.id}`}>
          View <ArrowRight className="ml-1 h-3 w-3" />
        </Link>
      </Button>
    </div>
  </motion.div>
);

const Index = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .in("status", ["published", "completed"])
        .order("event_date", { ascending: false });

      setEvents((data ?? []) as EventRow[]);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url, community, position");

      setMembers((data ?? []) as Member[]);
    })();
  }, []);

  const groupedMembers = useMemo(() => {
    const groups: any = {
      leads: [],
      heads: [],
      subs: [],
      others: [],
    };

    members.forEach((m) => {
      const role = (m.position || "").toLowerCase();

      if (role.includes("lead")) groups.leads.push(m);
      else if (role.includes("head")) groups.heads.push(m);
      else if (role.includes("sub")) groups.subs.push(m);
      else groups.others.push(m);
    });

    return groups;
  }, [members]);

  const { upcoming, past } = useMemo(() => {
    const today = new Date();
    const upcoming: EventRow[] = [];
    const past: EventRow[] = [];

    events.forEach((e) => {
      const isPast =
        e.status === "completed" ||
        (e.event_date && new Date(e.event_date) < today);

      if (isPast) past.push(e);
      else upcoming.push(e);
    });

    return { upcoming, past };
  }, [events]);

  return (
    <Layout>
      <AnnouncementBanner />

      {/* HERO */}
      <section className="container py-20 text-center">
        <h1 className="text-5xl font-bold">
          Innovation &{" "}
          <span className="text-gradient-emerald">Entrepreneurship</span>
        </h1>
        <p className="mt-4 text-muted-foreground">
          One platform for all communities
        </p>
      </section>

      {/* EVENTS */}
      <section className="container py-10">
        <h2 className="text-2xl font-bold mb-6">Upcoming Events</h2>

        <div className="grid gap-4 md:grid-cols-3">
          {upcoming.map((e, i) => (
            <EventCard key={e.id} e={e} i={i} />
          ))}
        </div>
      </section>

      {/* EXECOM */}
      <section className="container py-16">
        <h2 className="text-3xl font-bold mb-10 text-center">
          Meet our Execom
        </h2>

        {[
          { title: "Leads", data: groupedMembers.leads },
          { title: "Heads", data: groupedMembers.heads },
          { title: "Sub Heads", data: groupedMembers.subs },
          { title: "Team", data: groupedMembers.others },
        ].map(
          (section) =>
            section.data.length > 0 && (
              <div key={section.title} className="mb-12">
                <h3 className="text-xl font-semibold mb-6">
                  {section.title}
                </h3>

                <div className="grid gap-4 md:grid-cols-4">
                  {section.data.map((m: Member, i: number) => (
                    <motion.div
                      key={m.user_id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass rounded-xl p-4 text-center"
                    >
                      <img
                        src={m.photo_url || "/placeholder.png"}
                        className="h-20 w-20 mx-auto rounded-full object-cover mb-3"
                      />
                      <div className="font-semibold">{m.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.position}
                      </div>
                      <div className="text-xs text-gold mt-1">
                        {m.community}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
        )}
      </section>

      {/* HIGHLIGHTS */}
      <HighlightsGrid />

      {/* FOOTER SOCIAL */}
      <section className="container py-16 text-center">
        <h2 className="text-2xl font-bold mb-6">Follow Us</h2>

        <div className="flex justify-center gap-4">
          <Instagram />
          <Facebook />
          <Linkedin />
        </div>
      </section>
    </Layout>
  );
};

export default Index;
