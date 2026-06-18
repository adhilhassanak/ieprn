import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { COMMUNITY_LIST } from "@/lib/communities";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  Plus,
  Users,
  FileUp,
  IndianRupee,
} from "lucide-react";
import { StudentTabs } from "@/components/dashboard/StudentTabs";
import { ExecomMembers } from "@/components/dashboard/ExecomMembers";
import { FinancePanel } from "@/components/admin/FinancePanel";

const DOC_HEAD_FORM_URL =
  "https://forms.zohopublic.in/adhilhassanakgm1/form/EventRegistrationForm/formperma/ekOxe5Agecbf8k9eF4-9xbYUWvUlbjxnOPMQAkZry8g";

const Dashboard = () => {
  const { user, roles, isExecutive, isAdmin, isDocumentationHead: roleDocHead, isFinanceHead: roleFinHead } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [coordinatedEvents, setCoordinatedEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const [
        { data: p },
        { data: r },
        { data: e },
        { data: ec },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),

        supabase
          .from("registrations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("events")
          .select("*")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("event_coordinators")
          .select("event_id, events(*)")
          .eq("user_id", user.id),
      ]);

      setProfile(p);
      setRegistrations(r ?? []);
      setMyEvents(e ?? []);
      setCoordinatedEvents(
        (ec ?? []).map((x: any) => x.events).filter(Boolean)
      );
    })();
  }, [user]);

  const approvedPositions = registrations
    .filter((r) => r.status === "approved")
    .map((r) => String(r.current_position ?? "").trim().toLowerCase());
  const isDocumentationHead = roleDocHead || approvedPositions.includes("documentation head");
  const isFinanceHead = roleFinHead || approvedPositions.includes("finance head");

  const statusBadge = (status: string) => {
    if (status === "approved") {
      return (
        <Badge className="bg-primary/20 text-primary border-primary/40">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    }

    if (status === "rejected") {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    }

    return (
      <Badge className="bg-gold/20 text-gold border-gold/40">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  /* --------------------------------------------------
     SHOW ONLY COMMUNITIES NOT YET REGISTERED
  -------------------------------------------------- */

  const registeredCommunities = registrations.map((r) =>
    String(r.community).toLowerCase().replace(/[^a-z]/g, "")
  );

  const availableCommunities = COMMUNITY_LIST.filter(
    (c) =>
      !registeredCommunities.includes(
        c.short.toLowerCase().replace(/[^a-z]/g, "")
      )
  );

  const totalParticipants = myEvents.reduce(
    (s, e) => s + (e.actual_participants || 0),
    0,
  );
  const docsCount = myEvents.filter((e) => e.pdf_url).length;
  const coordinatorsCount = coordinatedEvents.length;

  return (
    <Layout>
      <div className="container py-10">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold">
            Welcome,{" "}
            <span className="text-gradient">
              {profile?.full_name || user?.email}
            </span>
          </h1>

          <div className="mt-3 flex flex-wrap gap-2">
            {roles.map((role) => (
              <span
                key={role}
                className="px-3 py-1 text-xs rounded-full bg-primary/15 border border-primary/30 capitalize text-primary"
              >
                {role.replace("_", " ")}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        {isExecutive && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Events Conducted" value={myEvents.length} />
            <StatCard title="Participants Handled" value={totalParticipants} />
            <StatCard title="Documents Uploaded" value={docsCount} />
            <StatCard title="Events Coordinated" value={coordinatorsCount} />
          </div>
        )}

        {/* Quick actions */}
        {isExecutive && (
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <Link
              to="/events/new"
              className="relative overflow-hidden rounded-2xl p-6 cursor-pointer block bg-gradient-gold text-gold-foreground shadow-glow-gold hover:scale-[1.02] transition-smooth ring-2 ring-gold/60"
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90">
                <Plus className="h-3.5 w-3.5" /> Primary action
              </div>
              <h3 className="mt-2 text-xl font-bold">Create New Event</h3>
              <p className="text-sm opacity-90 mt-1">
                Schedule a new event for your community
              </p>
            </Link>
            <a href="#my-events" className="glass-card p-6 cursor-pointer block">
              <h3 className="text-lg font-semibold">My Events</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Manage events, attendance and documentation
              </p>
            </a>
          </div>
        )}

        {/* Role-specific tools */}
        {(isDocumentationHead || isFinanceHead) && (
          <section className="mt-6 grid gap-3 md:grid-cols-2">
            {isDocumentationHead && (
              <div className="glass rounded-xl p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/15 flex items-center justify-center">
                  <FileUp className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">Documentation Head</div>
                  <div className="text-xs text-muted-foreground">Submit event documentation via the Zoho form.</div>
                </div>
                <Button asChild className="bg-gradient-emerald text-primary-foreground">
                  <a href={DOC_HEAD_FORM_URL} target="_blank" rel="noreferrer">
                    Upload Documentation
                  </a>
                </Button>
              </div>
            )}
            {isFinanceHead && (
              <div className="glass rounded-xl p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-gold/15 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">Finance Head</div>
                  <div className="text-xs text-muted-foreground">Update the current finance balance below.</div>
                </div>
              </div>
            )}
          </section>
        )}

        {isFinanceHead && !isAdmin && (
          <section className="mt-6">
            <FinancePanel />
          </section>
        )}

        {/* ExeCom Registration Section */}
        {availableCommunities.length > 0 && (
          <section className="mt-8">
            <div className="glass rounded-2xl p-6">
              <h2 className="text-xl font-semibold">
                ExeCom Registration
              </h2>

              <p className="text-sm text-muted-foreground mt-1">
                Apply only for communities you have not registered yet.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {availableCommunities.map((c) => (
                  <Button
                    key={c.key}
                    asChild
                    variant="outline"
                    className="border-primary/30 hover:border-primary hover:text-primary"
                  >
                    <Link to={`/register/${c.key}`}>
                      Apply for {c.short}
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Already Applied */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4">
            Your ExeCom Applications
          </h2>

          {registrations.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
              No applications submitted yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {registrations.map((r) => (
                <div
                  key={r.id}
                  className="glass rounded-xl p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gold">
                        {r.community}
                      </div>

                      <h3 className="mt-1 font-semibold">
                        {r.current_position}
                      </h3>

                      <p className="text-sm text-muted-foreground mt-1">
                        {r.full_name} · Sem {r.semester}
                      </p>

                      {r.previous_position && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Previous: {r.previous_position}
                        </p>
                      )}
                    </div>

                    {statusBadge(r.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Events You Coordinate (creator + assigned coordinator, deduped) */}
        {(() => {
          const merged = [...myEvents, ...coordinatedEvents];
          const seen = new Set<string>();
          const unique = merged.filter((e) => {
            if (!e || seen.has(e.id)) return false;
            seen.add(e.id);
            return true;
          });
          if (!isExecutive && unique.length === 0) return null;
          return (
            <section id="my-events" className="mt-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Events You Coordinate</h2>
                {isExecutive && (
                  <Button asChild size="sm" className="bg-gradient-emerald text-primary-foreground">
                    <Link to="/events/new">
                      <Plus className="h-4 w-4 mr-1" />
                      New Event
                    </Link>
                  </Button>
                )}
              </div>
              {unique.length === 0 ? (
                <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
                  No events yet.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {unique.map((e) => (
                    <EventCard key={e.id} e={e} manage />
                  ))}
                </div>
              )}
            </section>
          );
        })()}

        {/* Student Tabs */}
        <StudentTabs />

        {/* ExeCom Members */}
        {isExecutive && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              ExeCom Members
              {!isAdmin && profile?.community
                ? ` · ${profile.community}`
                : ""}
            </h2>

            <ExecomMembers />
          </section>
        )}
      </div>
    </Layout>
  );
};

const EventCard = ({
  e,
  manage,
  coord,
}: {
  e: any;
  manage?: boolean;
  coord?: boolean;
}) => {
  return (
    <div className="glass rounded-xl p-5 hover:border-primary/40 transition-smooth">
      <div className="flex gap-3">
        {e.poster_url ? (
          <img
            src={e.poster_url}
            alt={e.name}
            className="h-16 w-16 rounded-lg object-cover border border-border/50 flex-shrink-0"
          />
        ) : (
          <div className="h-16 w-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-gold uppercase">
            <Calendar className="h-3 w-3" />
            {e.community}
            <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] bg-secondary capitalize">
              {e.status}
            </span>
          </div>

          <h3 className="mt-1 font-semibold truncate">{e.name}</h3>

          {e.event_date && (
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(e.event_date).toLocaleDateString()} ·{" "}
              {e.venue ?? "TBA"}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="px-2 text-primary"
        >
          <Link to={`/events/${e.slug ?? e.id}`}>
            View
          </Link>
        </Button>

        {manage && (
          <Button asChild size="sm" variant="ghost">
            <Link to={`/events/${e.id}/manage`}>
              Manage
            </Link>
          </Button>
        )}

        {coord && (
          <Button asChild size="sm" variant="ghost">
            <Link to={`/events/${e.id}/coordinator`}>
              Participants
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value }: { title: string; value: number }) => (
  <div className="glass-card p-6">
    <div className="text-3xl font-bold text-gradient">{value}</div>
    <div className="text-sm text-muted-foreground mt-2">{title}</div>
  </div>
);

export default Dashboard;
