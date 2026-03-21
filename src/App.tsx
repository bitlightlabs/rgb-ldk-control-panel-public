import { AppHeader } from "@/app/components/AppHeader";
import { AppSidebar } from "@/app/components/AppSidebar";
import { NodeSetupGuard } from "@/app/components/NodeSetupGuard";
import NoNodesConfigured from "@/app/components/NoNodesConfigured";
import {
  appRoutes,
  getSidebarActiveId,
  matchActiveRoute,
  sidebarItems,
  type AppRouteConfig,
} from "@/app/config/appRoutes";
import { useNodeStore } from "@/app/stores/nodeStore";
import {
  bootstrapLocalNode,
  contextsList,
  dockerEnvironment,
  eventsStart,
} from "@/lib/commands";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Suspense, useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Toaster } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar";
import "./App.css";

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-xl border ui-border ui-muted-10">
      <div className="text-sm ui-muted">Loading page...</div>
    </div>
  );
}

function RoutePage({
  route,
  hasContexts,
  onGoNodes,
}: {
  route: AppRouteConfig;
  hasContexts: boolean;
  onGoNodes: () => void;
}) {
  const Component = route.component;
  return (
    <NoNodesConfigured
      hasConfiguredNodes={!route.requiresNode || hasContexts}
      onGoNodes={onGoNodes}
    >
      <Component />
    </NoNodesConfigured>
  );
}

function App() {
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const setActiveNodeId = useNodeStore((s) => s.setActiveNodeId);
  const navigate = useNavigate();
  const location = useLocation();

  const contextsQuery = useQuery({
    queryKey: ["contexts"],
    queryFn: contextsList,
    refetchInterval: false,
  });
  const dockerEnvironmentQuery = useQuery({
    queryKey: ["docker_environment"],
    queryFn: dockerEnvironment,
    refetchInterval: 10_000,
  });

  const bootstrapLocalNodeMutation = useMutation({
    mutationFn: bootstrapLocalNode,
    onSuccess: async (result) => {
      await contextsQuery.refetch();
      setActiveNodeId(result.node_id);
      await eventsStart(result.node_id);
      navigate("/nodes", { replace: true });
    },
  });

  const contexts = contextsQuery.data ?? [];
  const contextsReady = contextsQuery.isSuccess || contextsQuery.isError;
  const dockerEnvironmentReady =
    dockerEnvironmentQuery.isSuccess || dockerEnvironmentQuery.isError;

  const activeRoute = matchActiveRoute(location.pathname);
  const activeSidebarId = getSidebarActiveId(location.pathname);

  useEffect(() => {
    if (activeNodeId && contexts.some((c) => c.node_id === activeNodeId)) {
      return;
    }
    setActiveNodeId(contexts[0]?.node_id ?? null);
  }, [activeNodeId, contexts, setActiveNodeId]);

  return (
    <NodeSetupGuard
      contexts={contexts}
      contextsReady={contextsReady}
      contextsPending={!contextsReady}
      dockerEnvironmentData={dockerEnvironmentQuery.data}
      dockerEnvironmentReady={dockerEnvironmentReady}
      dockerEnvironmentPending={!dockerEnvironmentReady}
      dockerEnvironmentChecking={
        dockerEnvironmentQuery.isLoading || dockerEnvironmentQuery.isFetching
      }
      onRefreshDockerEnvironment={() => {
        void dockerEnvironmentQuery.refetch();
      }}
      creatingNode={bootstrapLocalNodeMutation.isPending}
      createNodeError={
        bootstrapLocalNodeMutation.isError
          ? bootstrapLocalNodeMutation.error
          : undefined
      }
      createNodeResult={bootstrapLocalNodeMutation.data}
      onCreateNode={async (req) =>
        await bootstrapLocalNodeMutation.mutateAsync(req)
      }
      onEnterWallet={() => {
        // Clear bootstrap snapshot so setup page can start fresh if all nodes
        // are later removed and user returns to initialization flow.
        bootstrapLocalNodeMutation.reset();
        navigate("/dashboard", { replace: true });
      }}
    >
      <SidebarProvider className="h-svh overflow-hidden">
        <AppSidebar
          items={sidebarItems}
          activeItemId={activeSidebarId}
          onNavigate={(path) => navigate(path)}
        />
        <SidebarInset className="h-svh overflow-hidden">
          <AppHeader
            activeLabel={activeRoute?.label ?? "Dashboard"}
            contexts={contexts}
            activeNodeId={activeNodeId}
            onPickNode={(nodeId) => {
              setActiveNodeId(nodeId);
              navigate("/dashboard");
            }}
          />
          <main className="flex min-h-0 flex-1 overflow-hidden p-4">
            <ScrollArea className="h-full w-full">
              <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to="/dashboard" replace />}
                  />
                  {appRoutes.map((route) => (
                    <Route
                      key={route.id}
                      path={route.path}
                      element={
                        <RoutePage
                          route={route}
                          hasContexts={contexts.length > 0}
                          onGoNodes={() => navigate("/nodes")}
                        />
                      }
                    />
                  ))}
                  <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                  />
                </Routes>
              </Suspense>
            </ScrollArea>
            <Toaster richColors />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </NodeSetupGuard>
  );
}

export default App;
