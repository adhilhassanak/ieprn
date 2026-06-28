import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight, Trophy } from "lucide-react";
import { motion } from "framer-motion";

const activities = [
  {
    title: "NEC Challenge",
    date: "Ongoing",
    description: "National Entrepreneurship Challenge by E-Cell IIT Bombay.",
  },
  {
    title: "Startup Bootcamp",
    date: "Coming Soon",
    description: "Hands-on sessions for aspiring entrepreneurs.",
  },
  {
    title: "Innovation Workshop",
    date: "Coming Soon",
    description: "Learn Design Thinking and Product Development.",
  },
];

export const EcellActivityCalendar = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Trophy className="h-6 w-6 text-amber-500" />
        </div>

        <div>
          <h2 className="text-2xl font-bold">
            E-Cell Activity Calendar
          </h2>

          <p className="text-sm text-muted-foreground">
            Upcoming E-Cell activities and entrepreneurship programs.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-background/40 p-4 hover:border-primary transition"
          >
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-1" />

              <div className="flex-1">
                <h3 className="font-semibold">
                  {activity.title}
                </h3>

                <p className="text-xs text-primary mt-1">
                  {activity.date}
                </p>

                <p className="text-sm text-muted-foreground mt-2">
                  {activity.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Button asChild className="w-full md:w-auto">
          <Link to="/ecell/calendar">
            Read More
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
};
