import { Navigate, useLocation } from "react-router-dom";
import { getHostPassword } from "@/lib/storage";

export function HostGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const pw = getHostPassword();
  if (!pw) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/host/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}
