import { useContextStore } from "@/app/stores/contextStore";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function DashboardGuard() {
  const currentContext = useContextStore((s) => s.currentContext);
  const location = useLocation();

  if (!currentContext?.node_id) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
