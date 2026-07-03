import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import CepChallenge from "./pages/CepChallenge";
import CepCommunity from "./pages/CepCommunity";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeBootstrap } from "@/components/ThemeBootstrap";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register";
import EventCreate from "./pages/EventCreate";
import EventManage from "./pages/EventManage";
import EventDetails from "./pages/EventDetails";
import Coordinator from "./pages/Coordinator";
import Admin from "./pages/Admin";
import Gallery from "./pages/Gallery";
import Profile from "./pages/Profile";
import CommunityLogos from "./pages/CommunityLogos";
import Trust from "./pages/Trust";
import ExecomCommunity from "./pages/ExecomCommunity";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeBootstrap />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/trust" element={<Trust />} />
            <Route path="/execom/:community" element={<ExecomCommunity />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/register/:community" element={<ProtectedRoute><Register /></ProtectedRoute>} />
            <Route path="/events/new" element={<ProtectedRoute requireRole={["executive_member", "co_admin", "admin"]}><EventCreate /></ProtectedRoute>} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/events/:id/manage" element={<ProtectedRoute requireRole={["executive_member", "co_admin", "admin"]}><EventManage /></ProtectedRoute>} />
            <Route path="/events/:id/coordinator" element={<ProtectedRoute requireRole={["coordinator", "executive_member", "co_admin", "admin"]}><Coordinator /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireRole={["admin", "co_admin"]}><Admin /></ProtectedRoute>} />
            <Route path="/admin/community-logos" element={<ProtectedRoute requireRole={["admin"]}><CommunityLogos /></ProtectedRoute>} />
            <Route
  path="/cep-challenge"
  element={
    <ProtectedRoute>
      <CepChallenge />
    </ProtectedRoute>
  }
/>
            <Route
  path="/cep/:community"
  element={
    <ProtectedRoute>
      <CepCommunity />
    </ProtectedRoute>
  }
/>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
