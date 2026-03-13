import { NodeContextDialog } from "@/app/components/NodeContextDialog";
import { useNodeStore } from "@/app/stores/nodeStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  bootstrapLocalNode,
  contextsList,
  contextsRemove,
  contextsUpsert,
  dockerEnvironment,
  eventsStart,
  eventsStatusAll,
  eventsStop,
  nodeControlStatus,
  nodeLock,
  nodeMainBalances,
  nodeMainHealthz,
  nodeMainReadyz,
  nodeUnlock,
  eventsStart as startEvents,
} from "@/lib/commands";
import type { NodeContext } from "@/lib/domain";
import { errorToText } from "@/lib/errorToText";
import { cn } from "@/lib/utils";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Lock,
  Play,
  Square,
  Trash2,
  Unlock,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function NodesManagePage() {
  const queryClient = useQueryClient();
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const setActiveNodeId = useNodeStore((s) => s.setActiveNodeId);

  const contextsQuery = useQuery({
    queryKey: ["contexts"],
    queryFn: contextsList,
    refetchInterval: 10_000,
  });
  const contexts = contextsQuery.data ?? [];

  const eventsStatusAllQuery = useQuery({
    queryKey: ["events_status_all"],
    queryFn: eventsStatusAll,
    refetchInterval: 2_000,
  });

  const dockerEnvQuery = useQuery({
    queryKey: ["docker_environment"],
    queryFn: dockerEnvironment,
    refetchInterval: 10_000,
  });

  useEffect(() => {
    if (activeNodeId && contexts.some((c) => c.node_id === activeNodeId))
      return;
    setActiveNodeId(contexts[0]?.node_id ?? null);
  }, [activeNodeId, contexts, setActiveNodeId]);

  const bootstrapLocalNodeMutation = useMutation({
    mutationFn: bootstrapLocalNode,
    onSuccess: async (created) => {
      await contextsQuery.refetch();
      setActiveNodeId(created.node_id);
      await eventsStart(created.node_id);
      await eventsStatusAllQuery.refetch();
      setCreateDialogOpen(false);
      setNodeName("");
      setValidationError(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (nodeId: string) => contextsRemove(nodeId),
    onSuccess: async () => {
      const next = await contextsQuery.refetch();
      const nextContexts = next.data ?? [];
      setActiveNodeId(nextContexts[0]?.node_id ?? null);
    },
  });

  const [contextDialogOpen, setContextDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<NodeContext | null>(null);
  const editingContext = useMemo(
    () => contexts.find((c) => c.node_id === editingNodeId) ?? null,
    [contexts, editingNodeId]
  );

  const upsertMutation = useMutation({
    mutationFn: (context: NodeContext) => contextsUpsert(context),
    onSuccess: async (_data, context) => {
      await contextsQuery.refetch();
      setContextDialogOpen(false);
      setEditingNodeId(null);
      setActiveNodeId(context.node_id);
      await startEvents(context.node_id);
      await eventsStatusAllQuery.refetch();
    },
  });

  const [nodeName, setNodeName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const eventsToggleMutation = useMutation({
    mutationFn: async ({
      nodeId,
      nextRunning,
    }: {
      nodeId: string;
      nextRunning: boolean;
    }) => {
      if (nextRunning) await eventsStart(nodeId);
      else await eventsStop(nodeId);
    },
    onSuccess: async () => {
      await eventsStatusAllQuery.refetch();
    },
  });

  const nodesListHealthzQueries = useQueries({
    queries: contexts.map((c) => ({
      queryKey: ["node_list_healthz", c.node_id],
      queryFn: () => nodeMainHealthz(c.node_id),
      refetchInterval: 10_000,
      retry: 0,
    })),
  });
  const nodesListReadyzQueries = useQueries({
    queries: contexts.map((c) => ({
      queryKey: ["node_list_readyz", c.node_id],
      queryFn: () => nodeMainReadyz(c.node_id),
      refetchInterval: 10_000,
      retry: 0,
    })),
  });
  const nodesListBalancesQueries = useQueries({
    queries: contexts.map((c) => ({
      queryKey: ["node_list_balances", c.node_id],
      queryFn: () => nodeMainBalances(c.node_id),
      refetchInterval: 10_000,
      retry: 0,
    })),
  });
  const nodesListControlStatusQueries = useQueries({
    queries: contexts.map((c) => ({
      queryKey: ["node_control_status", c.node_id],
      queryFn: () => nodeControlStatus(c.node_id),
      refetchInterval: 10_000,
      retry: 0,
      enabled: !!c.control_api_base_url,
    })),
  });

  const dockerInstalled = dockerEnvQuery.data?.installed === true;
  const dockerRunning = dockerEnvQuery.data?.daemon_running === true;
  const canCreate =
    dockerInstalled && dockerRunning && !bootstrapLocalNodeMutation.isPending;
  const dockerInstalledBadge =
    dockerEnvQuery.isLoading || dockerEnvQuery.isFetching
      ? {
          label: "DOCKER ...",
          variant: "secondary" as const,
          Icon: Loader2,
          spin: true,
        }
      : dockerInstalled
      ? {
          label: "DOCKER INSTALLED",
          variant: "success" as const,
          Icon: CheckCircle2,
          spin: false,
        }
      : {
          label: "DOCKER MISSING",
          variant: "destructive" as const,
          Icon: XCircle,
          spin: false,
        };
  const dockerDaemonBadge =
    dockerEnvQuery.isLoading || dockerEnvQuery.isFetching
      ? {
          label: "DAEMON ...",
          variant: "secondary" as const,
          Icon: Loader2,
          spin: true,
        }
      : dockerRunning
      ? {
          label: "DAEMON RUNNING",
          variant: "success" as const,
          Icon: CheckCircle2,
          spin: false,
        }
      : {
          label: "DAEMON STOPPED",
          variant: "warning" as const,
          Icon: AlertTriangle,
          spin: false,
        };
  const lockToggleMutation = useMutation({
    mutationFn: async ({
      nodeId,
      nextLocked,
    }: {
      nodeId: string;
      nextLocked: boolean;
    }) => {
      if (nextLocked) return nodeLock(nodeId);
      return nodeUnlock(nodeId);
    },
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(["node_control_status", variables.nodeId], data);
      await queryClient.invalidateQueries({
        queryKey: ["node_control_status", variables.nodeId],
      });
      await queryClient.refetchQueries({
        queryKey: ["node_control_status", variables.nodeId],
      });
    },
  });

  return (
    <>
      <NodeContextDialog
        open={contextDialogOpen}
        onOpenChange={setContextDialogOpen}
        initial={editingContext}
        isSubmitting={upsertMutation.isPending}
        submitError={
          upsertMutation.isError ? errorToText(upsertMutation.error) : undefined
        }
        onSubmit={(ctx) => upsertMutation.mutate(ctx)}
      />
      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove node context?</DialogTitle>
            <DialogDescription>
              This removes the context and attempts to remove its local Docker
              container and data volume (if present).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setRemoveTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="ui-danger-button"
              disabled={!removeTarget || removeMutation.isPending}
              onClick={() => {
                if (!removeTarget) return;
                removeMutation.mutate(removeTarget.node_id);
                setRemoveTarget(null);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setValidationError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Node</DialogTitle>
            <DialogDescription>
              Create another local docker node by node name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={nodeName}
              onChange={(e) => setNodeName(e.currentTarget.value)}
              placeholder="Node name"
            />
            {!dockerInstalled ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
                Docker is required. Install Docker Desktop/Engine first.
              </div>
            ) : null}
            {validationError ? (
              <Alert variant="destructive">
                <AlertTitle>Invalid parameters</AlertTitle>
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            ) : null}
            {bootstrapLocalNodeMutation.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Failed to create node</AlertTitle>
                <AlertDescription>
                  {errorToText(bootstrapLocalNodeMutation.error)}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canCreate}
              onClick={() => {
                const name = nodeName.trim();
                if (!name) {
                  setValidationError("Node name is required");
                  return;
                }
                setValidationError(null);
                bootstrapLocalNodeMutation.mutate({ nodeName: name });
              }}
            >
              {bootstrapLocalNodeMutation.isPending
                ? "Creating Node..."
                : "Create Node"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="space-y-3">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>Node Overview</CardTitle>
                <CardDescription>
                  {dockerEnvQuery.data?.version ? (
                    <span className="text-xs">
                      Version: {dockerEnvQuery.data.version}
                    </span>
                  ) : null}
                </CardDescription>
              </div>
              {/* <Button
                type="button"
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Create Node
              </Button> */}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={dockerInstalledBadge.variant} className="gap-1">
                <dockerInstalledBadge.Icon
                  className={cn(
                    "h-3 w-3",
                    dockerInstalledBadge.spin ? "animate-spin" : ""
                  )}
                />
                <span className="text-[10px] font-normal">
                  {dockerInstalledBadge.label}
                </span>
              </Badge>
              <Badge variant={dockerDaemonBadge.variant} className="gap-1">
                <dockerDaemonBadge.Icon
                  className={cn(
                    "h-3 w-3",
                    dockerDaemonBadge.spin ? "animate-spin" : ""
                  )}
                />
                <span className="text-[10px] font-normal">
                  {dockerDaemonBadge.label}
                </span>
              </Badge>
            </div>
            {lockToggleMutation.isError ? (
              <Alert variant="destructive" className="mt-3">
                <AlertTitle>Failed to update lock state</AlertTitle>
                <AlertDescription>
                  {errorToText(lockToggleMutation.error)}
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="w-full text-sm">
              <TableHeader className="sticky top-0 z-10 ui-surface-80 backdrop-blur">
                <TableRow className="ui-border">
                  <TableHead className="px-3 py-2">Node</TableHead>
                  <TableHead className="px-3 py-2">Status</TableHead>
                  <TableHead className="px-3 py-2">Balance</TableHead>
                  <TableHead className="px-3 py-2 text-right">
                    Operate
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contexts.map((c, idx) => {
                  const healthz = nodesListHealthzQueries[idx];
                  const readyz = nodesListReadyzQueries[idx];
                  const balancesQ = nodesListBalancesQueries[idx];
                  const controlQ = nodesListControlStatusQueries[idx];
                  const eventsSt =
                    eventsStatusAllQuery.data?.[c.node_id] ?? null;
                  const controlConfigured = !!c.control_api_base_url;

                  const up =
                    healthz?.isSuccess && healthz.data?.ok === true
                      ? {
                          label: "UP",
                          variant: "success" as const,
                          Icon: CheckCircle2,
                          spin: false,
                        }
                      : healthz?.isError
                      ? {
                          label: "DOWN",
                          variant: "destructive" as const,
                          Icon: XCircle,
                          spin: false,
                        }
                      : {
                          label: "…",
                          variant: "secondary" as const,
                          Icon: Loader2,
                          spin: true,
                        };
                  const ready =
                    readyz?.isSuccess && readyz.data?.ok === true
                      ? {
                          label: "READY",
                          variant: "success" as const,
                          Icon: CheckCircle2,
                          spin: false,
                        }
                      : readyz?.isSuccess && readyz.data?.ok === false
                      ? {
                          label: "NOT READY",
                          variant: "warning" as const,
                          Icon: AlertTriangle,
                          spin: false,
                        }
                      : readyz?.isError
                      ? {
                          label: "ERR",
                          variant: "destructive" as const,
                          Icon: XCircle,
                          spin: false,
                        }
                      : {
                          label: "…",
                          variant: "secondary" as const,
                          Icon: Loader2,
                          spin: true,
                        };
                  const evt = eventsSt?.running
                    ? {
                        label: "EVT",
                        variant: "success" as const,
                        Icon: Activity,
                        spin: false,
                      }
                    : {
                        label: "EVT OFF",
                        variant: "warning" as const,
                        Icon: AlertTriangle,
                        spin: false,
                      };
                  const lockState = !controlConfigured
                    ? {
                        label: "LOCK N/A",
                        variant: "secondary" as const,
                        Icon: AlertTriangle,
                        spin: false,
                        locked: null as boolean | null,
                      }
                    : controlQ?.isSuccess
                    ? controlQ.data.locked
                      ? {
                          label: "LOCKED",
                          variant: "warning" as const,
                          Icon: Lock,
                          spin: false,
                          locked: true,
                        }
                      : {
                          label: "UNLOCKED",
                          variant: "success" as const,
                          Icon: Unlock,
                          spin: false,
                          locked: false,
                        }
                    : controlQ?.isError
                    ? {
                        label: "LOCK ERR",
                        variant: "destructive" as const,
                        Icon: XCircle,
                        spin: false,
                        locked: null as boolean | null,
                      }
                    : {
                        label: "LOCK ...",
                        variant: "secondary" as const,
                        Icon: Loader2,
                        spin: true,
                        locked: null as boolean | null,
                      };
                  const l1Text =
                    balancesQ?.isSuccess && balancesQ.data
                      ? `${balancesQ.data.btc.onchain_spendable_sats.toString()} sats`
                      : "…";
                  const l2Text =
                    balancesQ?.isSuccess && balancesQ.data
                      ? `${balancesQ.data.btc.lightning_total_sats.toString()} sats`
                      : "…";

                  return (
                    <TableRow
                      key={c.node_id}
                      className={cn(
                        "border-b ui-border transition-colors",
                        c.node_id === activeNodeId
                          ? "ui-muted-20"
                          : "hover:ui-muted-10"
                      )}
                    >
                      <TableCell className="px-3 py-2">
                        <button
                          type="button"
                          className="text-left"
                          data-testid={`pick-node-${c.node_id}`}
                          onClick={() => setActiveNodeId(c.node_id)}
                        >
                          <div className="truncate font-medium hover:underline">
                            {c.display_name}
                          </div>
                          <div className="truncate font-mono text-xs ui-muted">
                            {c.node_id}
                          </div>
                          <div className="truncate font-mono text-xs ui-muted">
                            {c.main_api_base_url}
                          </div>
                        </button>
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant={up.variant} className="gap-1">
                            <up.Icon
                              className={cn(
                                "h-3 w-3",
                                up.spin ? "animate-spin" : ""
                              )}
                            />
                            <span className="text-[10px] font-normal">
                              {up.label}
                            </span>
                          </Badge>
                          <Badge variant={ready.variant} className="gap-1">
                            <ready.Icon
                              className={cn(
                                "h-3 w-3",
                                ready.spin ? "animate-spin" : ""
                              )}
                            />
                            <span className="text-[10px] font-normal">
                              {ready.label}
                            </span>
                          </Badge>
                          <Badge
                            variant={evt.variant}
                            className={cn(
                              "gap-1",
                              eventsSt?.last_error ? "ui-danger" : undefined
                            )}
                            title={
                              eventsSt?.last_error
                                ? errorToText(eventsSt.last_error)
                                : undefined
                            }
                            data-testid={`events-status-${c.node_id}`}
                          >
                            <evt.Icon className="h-3 w-3" />
                            <span className="text-[10px] font-normal">
                              {evt.label}
                            </span>
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs ui-muted">
                        <div>Spendable: {l1Text}</div>
                        <div>Lightning: {l2Text}</div>
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                className="gap-1"
                              >
                                Actions
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={eventsToggleMutation.isPending}
                                onClick={() =>
                                  eventsToggleMutation.mutate({
                                    nodeId: c.node_id,
                                    nextRunning: !eventsSt?.running,
                                  })
                                }
                              >
                                {eventsSt?.running ? (
                                  <Square className="h-3.5 w-3.5" />
                                ) : (
                                  <Play className="h-3.5 w-3.5" />
                                )}
                                {eventsSt?.running
                                  ? "Stop events"
                                  : "Start events"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={
                                  lockToggleMutation.isPending ||
                                  !controlConfigured ||
                                  lockState.locked === false
                                }
                                onClick={() =>
                                  lockToggleMutation.mutate({
                                    nodeId: c.node_id,
                                    nextLocked: false,
                                  })
                                }
                              >
                                <Unlock className="h-3.5 w-3.5" />
                                Unlock
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={
                                  lockToggleMutation.isPending ||
                                  !controlConfigured ||
                                  lockState.locked === true
                                }
                                onClick={() =>
                                  lockToggleMutation.mutate({
                                    nodeId: c.node_id,
                                    nextLocked: true,
                                  })
                                }
                              >
                                <Lock className="h-3.5 w-3.5" />
                                Lock
                              </DropdownMenuItem>
                              {/* <DropdownMenuItem
                                onClick={() => {
                                  setEditingNodeId(c.node_id);
                                  setContextDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </DropdownMenuItem> */}
                              <DropdownMenuItem
                                className="ui-danger"
                                onClick={() => setRemoveTarget(c)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
