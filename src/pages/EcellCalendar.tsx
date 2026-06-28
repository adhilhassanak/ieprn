import { Layout } from "@/components/Layout";

const activities = [
  {
    title: "NEC Challenge",
    date: "Ongoing",
    description:
      "National Entrepreneurship Challenge organized by E-Cell IIT Bombay.",
  },
  {
    title: "Startup Bootcamp",
    date: "Coming Soon",
    description:
      "Training sessions for aspiring entrepreneurs and startup founders.",
  },
  {
    title: "Innovation Workshop",
    date: "Coming Soon",
    description:
      "Hands-on workshop covering Design Thinking and Product Development.",
  },
];

const EcellCalendar = () => {
  return (
    <Layout>
      <div className="container py-10">
        <h1 className="text-4xl font-bold mb-2">
          E-Cell Activity Calendar
        </h1>

        <p className="text-muted-foreground mb-8">
          Upcoming E-Cell activities, workshops and competitions.
        </p>

        <div className="space-y-6">
          {activities.map((activity, index) => (
            <div
              key={index}
              className="glass rounded-2xl p-6"
            >
              <h2 className="text-2xl font-semibold">
                {activity.title}
              </h2>

              <p className="text-primary mt-2">
                {activity.date}
              </p>

              <p className="mt-4 text-muted-foreground">
                {activity.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default EcellCalendar;
