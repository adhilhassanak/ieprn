import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sparkles,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  Image as ImageIcon,
  UserCircle2,
  Home,
  Menu as MenuIcon,
  Users,
} from "lucide-react";

export const Navbar = () => {
  const { user, isAdmin, isCoAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  // co_admin (only) — exclude pure admins from the co-admin item duplication
  const showCoAdminItem = isCoAdmin && !isAdmin;

  return (
    <header className="sticky top-0 z-40 w-full glass-strong border-b border-border/50">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Sparkles className="h-6 w-6 text-primary transition-smooth group-hover:rotate-12" />
            <div className="absolute inset-0 blur-md bg-primary/40 -z-10" />
          </div>
          <span className="font-semibold tracking-tight hidden sm:inline">
            <span className="text-gradient-gold">IE-Perumon</span> Portal
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          {/* Desktop inline links */}
          {user && (
            <div className="hidden md:flex items-center gap-1 mr-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <Home className="h-4 w-4 mr-1" /> Home
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                <LayoutDashboard className="h-4 w-4 mr-1" /> Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/gallery")}>
                <ImageIcon className="h-4 w-4 mr-1" /> Gallery
              </Button>
              {showCoAdminItem && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                  <Users className="h-4 w-4 mr-1" /> Co-admin
                </Button>
              )}
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                  <ShieldCheck className="h-4 w-4 mr-1" /> Admin
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                <UserCircle2 className="h-4 w-4 mr-1" /> Profile
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => { await signOut(); navigate("/"); }}
              >
                <LogOut className="h-4 w-4 mr-1" /> Logout
              </Button>
            </div>
          )}

          {!user && (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                Login
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/auth?mode=signup")}
                className="bg-gradient-emerald text-primary-foreground shadow-glow-emerald"
              >
                Get started
              </Button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Open menu" className="md:hidden">
                <MenuIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass-strong">
              <DropdownMenuLabel>Navigate</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate("/")}>
                <Home className="h-4 w-4 mr-2" /> Home
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/gallery")}>
                <ImageIcon className="h-4 w-4 mr-2" /> Gallery
              </DropdownMenuItem>

              {user && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
                  </DropdownMenuItem>

                  {showCoAdminItem && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Users className="h-4 w-4 mr-2" /> Co-admin panel
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <ShieldCheck className="h-4 w-4 mr-2" /> Admin panel
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <UserCircle2 className="h-4 w-4 mr-2" /> Profile update
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut();
                      navigate("/");
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
};
