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
import IconSuccess from "./app/icons/success";
import IconError from "./app/icons/IconError";
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

  // Initialize active node on app start or when contexts change.
  useEffect(() => {
    if (activeNodeId && contexts.some((c) => c.node_id === activeNodeId)) {
      return;
    }
    setActiveNodeId(contexts[0]?.node_id ?? null);
  }, [activeNodeId, contexts]);

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
      onEnterWallet={(nodeId) => {
        // Clear bootstrap snapshot so setup page can start fresh if all nodes
        // are later removed and user returns to initialization flow.
        bootstrapLocalNodeMutation.reset();
        if (nodeId) {
          setActiveNodeId(nodeId);
        }
        navigate("/dashboard", { replace: true });
      }}
    >
      <div className="h-svh overflow-hidden bg-background text-foreground">
        <SidebarProvider className="h-full overflow-hidden">
          <AppSidebar
            items={sidebarItems}
            activeItemId={activeSidebarId}
            onNavigate={(path) => navigate(path)}
            contexts={contexts}
            activeNodeId={activeNodeId}
          />
          <SidebarInset className="h-full overflow-hidden">
            {
              (location.pathname === "/peers"
                || location.pathname === "/channels"
                || location.pathname === "/settings"
              ) ? null : (
                <AppHeader
                  activeLabel={activeRoute?.label ?? "Dashboard"}
                  contexts={contexts}
                  activeNodeId={activeNodeId}
                  breadcrumb={activeRoute?.breadcrumb}
                  onPickNode={(nodeId) => {
                    setActiveNodeId(nodeId);
                    navigate("/dashboard");
                  }}
                />
              )
            }

            <main className="flex flex-col min-h-0 flex-1 overflow-hidden pl-2 pr-4">
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
              <Toaster
                expand={true}
                duration={5000}
                offset={{
                  right: '20px',
                  bottom: '20px',
                }}
                icons={{
                  success: <IconSuccess style={{width: '24px', height: '24px'}} />,
                  error: <IconError style={{width: '24px', height: '24px'}} />,
                }}
                toastOptions={{
                  style: {
                    width: "340px",
                    border: 0,
                    borderRadius: "12px",
                    gap: "10px",
                    paddingLeft: "16px",
                    paddingTop: "16px",
                    paddingBottom: "16px",
                    paddingRight: "16px",
                    fontSize: '17px',
                    fontWeight: 'normal'
                  },
                }}
              />
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </NodeSetupGuard>
  );
}

export default App;
