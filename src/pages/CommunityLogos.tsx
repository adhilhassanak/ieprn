import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { CommunityLogosPanel } from "@/components/admin/CommunityLogosPanel";

const CommunityLogos = () => {
  const { isAdmin, isCoAdmin, loading } = useAuth();

  if (!loading && !isAdmin && !isCoAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="container py-10 max-w-5xl">
        <BackButton />
        <CommunityLogosPanel />
      </div>
    </Layout>
  );
};

export default CommunityLogos;
