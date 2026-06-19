import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { ShieldCheck, Lock, Database, UserCheck, FileText, AlertTriangle, Mail } from "lucide-react";

const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <div className="glass rounded-2xl p-6">
    <div className="flex items-center gap-3 mb-3">
      <div className="h-10 w-10 rounded-lg bg-gradient-emerald grid place-items-center shadow-glow-emerald">
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
    </div>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </div>
);

const Trust = () => {
  return (
    <Layout>
      <div className="container py-12 max-w-5xl">
        <BackButton />
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-gold mb-2">
            <ShieldCheck className="h-4 w-4" /> Trust &amp; Security
          </div>
          <h1 className="text-3xl md:text-5xl font-bold">
            Built on a <span className="text-gradient-gold">secure foundation</span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            This page is maintained by the IEprn admin team to answer common security and privacy questions
            about the I&amp;E College of Engineering Perumon portal. It describes controls enabled today and
            is not a third-party certification.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Section icon={ShieldCheck} title="Security status">
            <p>Row-Level Security is enforced on every database table. Coordinator privileges can only be granted by Admins. Anonymous flooding of event registrations is blocked at the database layer.</p>
            <p>Database functions use a fixed search path to prevent function-resolution attacks.</p>
          </Section>

          <Section icon={Lock} title="Authentication protection">
            <p>Sign-in supports email + password and Google OAuth via Lovable Cloud managed providers. Passwords are stored hashed by the auth service; the portal never sees raw passwords.</p>
            <p>Password reset links are single-use and expire automatically.</p>
          </Section>

          <Section icon={Database} title="Data storage practices">
            <p>All structured data is stored in Lovable Cloud (Postgres) inside the project's private database. Uploaded files (event posters, gallery photos, profile photos) live in scoped storage buckets.</p>
            <p>Backups and infrastructure are managed by Lovable Cloud.</p>
          </Section>

          <Section icon={UserCheck} title="Your data &amp; rights">
            <p>You can update your profile, change your password, and request account deletion at any time by contacting the admin team. Contact details for coordinators and faculty are only published when those individuals are part of the public leadership listing.</p>
            <p>Phone numbers and email addresses of student registrants are visible only to Admins, the event creator, and the event's assigned coordinators.</p>
          </Section>

          <Section icon={FileText} title="Terms &amp; conditions">
            <p>By using this portal you agree to use it for legitimate academic, community, and event purposes only. Misuse, scraping, or unauthorised access attempts are prohibited.</p>
            <p>Content published by community admins (events, announcements, gallery photos) remains the property of the college.</p>
          </Section>

          <Section icon={AlertTriangle} title="Reporting a security issue">
            <p>If you discover a security vulnerability, please disclose it responsibly to the admin team before public disclosure. We aim to acknowledge reports within 72 hours.</p>
            <p className="inline-flex items-center gap-2 mt-2">
              <Mail className="h-4 w-4 text-primary" />
              <a href="mailto:ieprn.coep@gmail.com" className="text-primary hover:underline">ieprn.coep@gmail.com</a>
            </p>
          </Section>
        </div>

        <p className="mt-10 text-xs text-muted-foreground text-center">
          Last reviewed: {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long" })}
        </p>
      </div>
    </Layout>
  );
};

export default Trust;
