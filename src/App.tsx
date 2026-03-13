import { AppHeader } from "@/app/components/AppHeader";
import { AppSidebar } from "@/app/components/AppSidebar";
import { NodeSetupGuard } from "@/app/components/NodeSetupGuard";
import NoNodesConfigured from "@/app/components/NoNodesConfigured";
import { sidebarItems } from "@/app/config/sidebarItems";
import { useNavStore } from "@/app/stores/navStore";
import { useNodeStore } from "@/app/stores/nodeStore";
import {
  bootstrapLocalEnvironment,
  contextsList,
  dockerEnvironment,
  eventsStart,
} from "@/lib/commands";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "sonner";
import "./App.css";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar";

function App() {
  const activeTab = useNavStore((s) => s.activeTab);
  const setActiveTab = useNavStore((s) => s.setActiveTab);
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const setActiveNodeId = useNodeStore((s) => s.setActiveNodeId);

  const contextsQuery = useQuery({
    queryKey: ["contexts"],
    queryFn: contextsList,
    refetchInterval: 10_000,
  });
  const dockerEnvironmentQuery = useQuery({
    queryKey: ["docker_environment"],
    queryFn: dockerEnvironment,
    refetchInterval: 10_000,
  });
  const bootstrapLocalEnvironmentMutation = useMutation({
    mutationFn: bootstrapLocalEnvironment,
    onSuccess: async (result) => {
      await contextsQuery.refetch();
      const firstNodeId = result.created_nodes[0]?.node_id ?? null;
      if (firstNodeId) {
        setActiveNodeId(firstNodeId);
      }
      await Promise.all(
        result.created_nodes.map(async (n) => {
          await eventsStart(n.node_id);
        })
      );
      setActiveTab("nodes");
    },
  });

  const contexts = contextsQuery.data ?? [];
  const contextsReady = contextsQuery.isSuccess || contextsQuery.isError;
  const dockerEnvironmentReady =
    dockerEnvironmentQuery.isSuccess || dockerEnvironmentQuery.isError;

  const allItems = sidebarItems.flatMap((category) => category.items);
  const activeItem = allItems.find((item) => item.id === activeTab);
  const ActiveComponent = activeItem?.component;

  useEffect(() => {
    if (activeNodeId && contexts.some((c) => c.node_id === activeNodeId))
      return;
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
      creatingEnvironment={bootstrapLocalEnvironmentMutation.isPending}
      createEnvironmentError={
        bootstrapLocalEnvironmentMutation.isError
          ? bootstrapLocalEnvironmentMutation.error
          : undefined
      }
      bootstrapEnvironmentResult={bootstrapLocalEnvironmentMutation.data}
      onCreateEnvironment={async () =>
        await bootstrapLocalEnvironmentMutation.mutateAsync()
      }
      onEnterWallet={() => {
        // Clear bootstrap success/error snapshot so setup page can start again
        // if users later remove all nodes and return to initialization flow.
        bootstrapLocalEnvironmentMutation.reset();
        setActiveTab("dashboard");
      }}
    >
      <SidebarProvider>
        <AppSidebar
          items={sidebarItems}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <SidebarInset>
          <AppHeader
            activeLabel={activeItem?.label ?? "Dashboard"}
            contexts={contexts}
            activeNodeId={activeNodeId}
            onPickNode={(nodeId) => {
              setActiveNodeId(nodeId);
              setActiveTab("dashboard");
            }}
          />
          <main className="flex-1 overflow-auto p-4">
            {ActiveComponent ? (
              <NoNodesConfigured
                hasConfiguredNodes={
                  !activeItem?.requiresNode || contexts.length > 0
                }
                onGoNodes={() => setActiveTab("nodes")}
              >
                <ActiveComponent />
              </NoNodesConfigured>
            ) : null}
            <Toaster richColors />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </NodeSetupGuard>
  );
}

export default App;
