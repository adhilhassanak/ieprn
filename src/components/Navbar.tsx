import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sparkles, LogOut, LayoutDashboard, ShieldCheck, CalendarPlus } from "lucide-react";

export const Navbar = () => {
  const { user, isAdmin, isExecutive, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full glass-strong border-b border-border/50">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Sparkles className="h-6 w-6 text-primary transition-smooth group-hover:rotate-12" />
            <div className="absolute inset-0 blur-md bg-primary/40 -z-10" />
          </div>
          <span className="font-semibold tracking-tight hidden sm:inline">
            <span className="text-gradient-gold">I&E</span> Portal
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                <LayoutDashboard className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              {isExecutive && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/events/new")}>
                  <CalendarPlus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Create Event</span>
                </Button>
              )}
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                  <ShieldCheck className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Login</Button>
              <Button size="sm" onClick={() => navigate("/auth?mode=signup")} className="bg-gradient-emerald text-primary-foreground shadow-glow-emerald">
                Get started
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
