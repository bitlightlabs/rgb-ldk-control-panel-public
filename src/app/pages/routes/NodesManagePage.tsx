import CopyText from "@/app/components/CopyText";
import { NodeContextDialog } from "@/app/components/NodeContextDialog";
import Header from "@/app/components/nodes/Header";
import Pubkey from "@/app/components/nodes/Pubkey";
import { LDK_IMAGE } from "@/app/config/constant";
import {
  NETWORK_OPTIONS,
  getDefaultNetworkOption,
  getNetworkOption,
} from "@/app/config/networkOptions";
import { useNodeStore } from "@/app/stores/nodeStore";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Field, FieldLabel } from "@/components/ui/field";
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
import type { BitcoinNetwork, NodeContext } from "@/lib/domain";
import { errorToText } from "@/lib/errorToText";
import { formatAddress } from "@/lib/utils";
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
  Ellipsis,
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
    refetchInterval: false,
  });
  const contexts = contextsQuery.data ?? [];

  const eventsStatusAllQuery = useQuery({
    queryKey: ["events_status_all"],
    queryFn: eventsStatusAll,
    // refetchInterval: 2_000,
  });

  const dockerEnvQuery = useQuery({
    queryKey: ["docker_environment"],
    queryFn: dockerEnvironment,
    // refetchInterval: 10_000,
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
      setSelectedNetwork("regtest");
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
  const [selectedNetwork, setSelectedNetwork] =
    useState<BitcoinNetwork>("regtest");
  const [validationError, setValidationError] = useState<string | null>(null);
  const selectedNetworkOption = getNetworkOption(selectedNetwork);

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
  const isSelectedNetworkEnabled = NETWORK_OPTIONS.some(
    (item) => item.value === selectedNetwork && item.enabled !== false
  );
  const canCreate =
    dockerInstalled &&
    dockerRunning &&
    !bootstrapLocalNodeMutation.isPending &&
    isSelectedNetworkEnabled;

  useEffect(() => {
    if (isSelectedNetworkEnabled) return;
    setSelectedNetwork(getDefaultNetworkOption().value);
  }, [isSelectedNetworkEnabled]);
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
      if (!variables.nextLocked) {
        await startEvents(variables.nodeId);
        await eventsStatusAllQuery.refetch();
      }
      queryClient.setQueryData(["node_control_status", variables.nodeId], data);
      await queryClient.invalidateQueries({
        queryKey: ["node_control_status", variables.nodeId],
      });
      await queryClient.refetchQueries({
        queryKey: ["node_control_status", variables.nodeId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["events_status_all"],
      });
    },
  });

  return (
    <>
      <Header
        contexts={contexts}
        onCreateNode={() => setCreateDialogOpen(true)}
      />

      {lockToggleMutation.isError ? (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>
            {errorToText(lockToggleMutation.error)}
          </AlertDescription>
        </Alert>
      ) : null}

      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow>
            <TableHead>Node</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Pubkey1</TableHead>
            <TableHead>Address</TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contexts.map((c, idx) => {
            const healthz = nodesListHealthzQueries[idx];
            const readyz = nodesListReadyzQueries[idx];
            const controlQ = nodesListControlStatusQueries[idx];
            const eventsSt = eventsStatusAllQuery.data?.[c.node_id] ?? null;
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

            return (
              <TableRow key={c.node_id} className="h-14">
                <TableCell>
                  <span className="text-base">{c.display_name}</span>
                </TableCell>
                <TableCell>
                  {readyz?.isSuccess && readyz.data?.ok ? (
                    <Badge variant="success">Online</Badge>
                  ) : (
                    <Badge variant="destructive">Offline</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Pubkey activeNodeId={c.node_id} />
                </TableCell>
                <TableCell>
                  <div className="text-sm flex gap-2 items-center">
                    <span>{formatAddress(c.p2p_listen ?? "")}</span>
                    <CopyText
                      text={c.p2p_listen ?? ""}
                      className="text-secondary-foreground"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="destructive"
                        type="button"
                        className="w-8 h-8 px-0 py-0 rounded-full"
                      >
                        <Ellipsis />
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
                        {eventsSt?.running ? "Stop events" : "Start events"}
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
                      <DropdownMenuItem onClick={() => setRemoveTarget(c)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

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
        <DialogContent className="w-[400px]">
          <DialogHeader>
            <DialogTitle>Remove node context?</DialogTitle>
          </DialogHeader>
          <div className="text-base">
            This removes the context and attempts to remove its local Docker
            container and data volume (if present).
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              type="button"
              size="lg"
              className="rounded-full flex-1"
              onClick={() => setRemoveTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="white"
              type="button"
              size="lg"
              className="rounded-full flex-1"
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
          if (!bootstrapLocalNodeMutation.isPending) {
            setCreateDialogOpen(open);
          }
          if (!open) {
            setValidationError(null);
            bootstrapLocalNodeMutation.reset();
          }
        }}
      >
        <DialogContent className="w-[560px]">
          <DialogHeader>
            <DialogTitle>Create Node</DialogTitle>
          </DialogHeader>
          <div className="text-base">
            Start a new Docker container running an RGB Lightning Node.
          </div>
          <div className="space-y-4">
            <Field>
              <FieldLabel>Node Name</FieldLabel>
              <Input
                placeholder="e.g. My Node"
                value={nodeName}
                onChange={(e) => setNodeName(e.currentTarget.value)}
                className="h-13 rounded-2xl text-[22px] font-bold"
                maxLength={64}
                disabled={bootstrapLocalNodeMutation.isPending}
              />
            </Field>
            <Field>
              <FieldLabel>Network</FieldLabel>
              <div className="flex gap-3">
                {NETWORK_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={
                      bootstrapLocalNodeMutation.isPending ||
                      opt.enabled === false
                    }
                    onClick={() => setSelectedNetwork(opt.value)}
                    className={[
                      "flex flex-1 items-center justify-center gap-2 rounded-xl border px-2 py-2 text-sm disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/35",
                      selectedNetwork === opt.value
                        ? "border-success bg-success/12 text-success"
                        : "border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10",
                    ].join(" ")}
                  >
                    {opt.iconSrc ? (
                      <img src={opt.iconSrc} alt="" className="h-3.5 w-3.5" />
                    ) : null}
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            {/* Creating progress bar */}
            {bootstrapLocalNodeMutation.isPending ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Starting Docker container and initialising node…
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full animate-pulse rounded-full bg-primary"
                    style={{ width: "60%" }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {!dockerInstalled ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
              Docker is required. Install Docker Desktop/Engine first.
            </div>
          ) : !dockerRunning ? (
            <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs">
              Docker daemon is not running. Start Docker Desktop and re-check.
            </div>
          ) : null}

          {validationError ? (
            <Alert variant="destructive">
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          ) : null}

          {bootstrapLocalNodeMutation.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {errorToText(bootstrapLocalNodeMutation.error)}
              </AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              variant="destructive"
              type="button"
              size="lg"
              className="rounded-full"
              disabled={bootstrapLocalNodeMutation.isPending}
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="white"
              type="button"
              size="lg"
              className="rounded-full"
              disabled={!canCreate}
              onClick={() => {
                const name = nodeName.trim();
                if (!name) {
                  setValidationError("Node name is required");
                  return;
                }
                setValidationError(null);
                bootstrapLocalNodeMutation.mutate({
                  ldkImage: LDK_IMAGE,
                  nodeName: name,
                  network: selectedNetwork,
                  esploraUrl: selectedNetworkOption.esploraUrl,
                });
              }}
            >
              Create Node
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
