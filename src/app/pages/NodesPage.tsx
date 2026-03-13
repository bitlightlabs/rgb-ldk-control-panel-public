import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CheckCircle2, CircleMinus, Lock, Unlock, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { NodeContext } from "@/lib/domain";
import {
  eventsClear,
  nodeControlStatus,
  nodeLock,
  nodeMainBalances,
  nodeMainHealthz,
  nodeMainListeningAddresses,
  nodeMainNodeId,
  nodeMainPeers,
  nodeMainReadyz,
  nodeMainStatus,
  nodeMainVersion,
  nodeUnlock,
  nodeWalletNewAddress,
  nodeWalletSync,
} from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";

function isLockedStatus(value: unknown): value is { locked: boolean; running?: boolean } {
  return !!value && typeof value === "object" && "locked" in value;
}

function HealthBadge({ ok }: { ok: boolean | null }) {
  if (ok === null) {
    return (
      <Badge variant="secondary" className="gap-1">
        <CircleMinus className="h-3 w-3" />
        —
      </Badge>
    );
  }
  if (ok) {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        OK
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" />
      FAIL
    </Badge>
  );
}

function CopyButton({ value }: { value: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
      }}
      type="button"
    >
      Copy
    </Button>
  );
}

function JsonDetails({
  title,
  data,
  isLoading,
  isError,
  error,
  defaultOpen,
}: {
  title: string;
  data: unknown;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="rounded-md border ui-border ui-muted-10 px-3 py-2 text-sm"
      open={defaultOpen}
      onClick={(e) => {
        if (!(e.target instanceof HTMLElement)) return;
        if (e.target.closest("button")) e.preventDefault();
      }}
    >
      <summary className="cursor-pointer select-none text-xs font-semibold ui-muted">{title}</summary>
      <div className="mt-2">
        {isLoading ? (
          <div className="text-sm ui-muted">Loading...</div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertTitle>Request failed</AlertTitle>
            <AlertDescription>{errorToText(error)}</AlertDescription>
          </Alert>
        ) : (
          <pre className="max-h-72 overflow-auto rounded-md border ui-border ui-muted-30 p-3 text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </details>
  );
}

export function DashboardPage({
  activeNodeId,
  activeContext,
  controlConfigured,
  onGoChannels,
  onGoEvents,
}: {
  activeNodeId: string;
  activeContext: NodeContext;
  controlConfigured: boolean;
  onGoChannels: () => void;
  onGoEvents: () => void;
}) {
  const mainStatusQuery = useQuery({
    queryKey: ["node_main_status", activeNodeId],
    queryFn: () => nodeMainStatus(activeNodeId),
    refetchInterval: 2_000,
  });
  const mainHealthzQuery = useQuery({
    queryKey: ["node_main_healthz", activeNodeId],
    queryFn: () => nodeMainHealthz(activeNodeId),
    refetchInterval: 5_000,
  });
  const mainReadyzQuery = useQuery({
    queryKey: ["node_main_readyz", activeNodeId],
    queryFn: () => nodeMainReadyz(activeNodeId),
    refetchInterval: 5_000,
  });
  const controlStatusQuery = useQuery({
    queryKey: ["node_control_status", activeNodeId],
    queryFn: () => nodeControlStatus(activeNodeId),
    refetchInterval: 2_000,
    enabled: controlConfigured,
  });

  const mainVersionQuery = useQuery({
    queryKey: ["node_main_version", activeNodeId],
    queryFn: () => nodeMainVersion(activeNodeId),
  });
  const nodeIdQuery = useQuery({
    queryKey: ["node_main_node_id", activeNodeId],
    queryFn: () => nodeMainNodeId(activeNodeId),
  });
  const listeningAddressesQuery = useQuery({
    queryKey: ["node_main_listening_addresses", activeNodeId],
    queryFn: () => nodeMainListeningAddresses(activeNodeId),
  });
  const peersQuery = useQuery({
    queryKey: ["node_main_peers", activeNodeId],
    queryFn: () => nodeMainPeers(activeNodeId),
    refetchInterval: 5_000,
  });

  const balancesQuery = useQuery({
    queryKey: ["node_main_balances", activeNodeId],
    queryFn: () => nodeMainBalances(activeNodeId),
    refetchInterval: 5_000,
  });

  const unlockMutation = useMutation({
    mutationFn: () => nodeUnlock(activeNodeId),
    onSuccess: async () => {
      await Promise.all([
        mainStatusQuery.refetch(),
        mainHealthzQuery.refetch(),
        mainReadyzQuery.refetch(),
        controlStatusQuery.refetch(),
        nodeIdQuery.refetch(),
        mainVersionQuery.refetch(),
        balancesQuery.refetch(),
        peersQuery.refetch(),
        listeningAddressesQuery.refetch(),
      ]);
    },
  });

  const lockMutation = useMutation({
    mutationFn: () => nodeLock(activeNodeId),
    onSuccess: async () => {
      await Promise.all([
        mainStatusQuery.refetch(),
        mainHealthzQuery.refetch(),
        mainReadyzQuery.refetch(),
        controlStatusQuery.refetch(),
        nodeIdQuery.refetch(),
        mainVersionQuery.refetch(),
        balancesQuery.refetch(),
        peersQuery.refetch(),
        listeningAddressesQuery.refetch(),
      ]);
    },
  });

  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const walletNewAddressMutation = useMutation({
    mutationFn: () => nodeWalletNewAddress(activeNodeId),
    onSuccess: async (resp) => {
      setDepositAddress(resp.address);
      await balancesQuery.refetch();
    },
  });
  const walletSyncMutation = useMutation({
    mutationFn: () => nodeWalletSync(activeNodeId),
    onSuccess: async () => {
      await balancesQuery.refetch();
    },
  });

  const versionText = useMemo(() => {
    if (!mainVersionQuery.data) return null;
    return `api=${mainVersionQuery.data.api_version} api_crate=${mainVersionQuery.data.api_crate_version} core=${mainVersionQuery.data.core_crate_version}`;
  }, [mainVersionQuery.data]);

  const locked = isLockedStatus(mainStatusQuery.data) && mainStatusQuery.data.locked;
  const mainAuthConfigured = !!activeContext.main_api_token_file_path;

  const peersTotal = peersQuery.data?.length ?? null;
  const peersConnected = peersQuery.data ? peersQuery.data.filter((p) => p.is_connected).length : null;

  const healthOk = mainHealthzQuery.data?.ok ?? null;
  const readyOk = mainReadyzQuery.data?.ok ?? null;
  const controlOk = controlStatusQuery.data?.ok ?? null;

  return (
    <div className="space-y-4">
	      {locked ? (
	        <Alert>
	          <AlertTitle>Node is locked</AlertTitle>
	          <AlertDescription>
	            This node is locked, so most actions are disabled until it’s unlocked.
	            Use the <span className="font-semibold">Unlock</span> button to unlock it.
	            {!controlConfigured ? (
	              <>
	                {" "}
	                Configure Control API (base URL + token file path) to enable Unlock/Lock.
	              </>
	            ) : null}
	          </AlertDescription>
	        </Alert>
	      ) : null}

      <Card>
        <CardHeader className="space-y-0 pb-3">
          <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{activeContext.display_name}</CardTitle>
                {locked ? (
                  <Badge variant="warning" className="gap-1">
                    <Lock className="h-3 w-3" />
                    LOCKED
                  </Badge>
                ) : mainStatusQuery.data ? (
                  <Badge variant="success" className="gap-1">
                    <Unlock className="h-3 w-3" />
                    UNLOCKED
                  </Badge>
                ) : null}
                <div className="flex items-center gap-2">
                  <span className="text-xs ui-muted">health</span>
                  <HealthBadge ok={healthOk} />
                  <span className="text-xs ui-muted">ready</span>
                  <HealthBadge ok={readyOk} />
                </div>
              </div>
              <CardDescription className="flex flex-wrap items-center gap-2 font-mono">
                <span>{activeContext.main_api_base_url}</span>
                <Badge variant="outline" className="font-sans text-[10px]">
                  main auth: {mainAuthConfigured ? "token file" : "none"}
                </Badge>
                {activeContext.allow_non_loopback ? (
                  <Badge variant="destructive" className="font-sans text-[10px]" title="Non-loopback URLs allowed for this context">
                    non-loopback allowed
                  </Badge>
                ) : null}
              </CardDescription>
              <div className="text-xs ui-muted">{versionText ?? "version: —"}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => walletSyncMutation.mutate()}
                disabled={walletSyncMutation.isPending}
                type="button"
              >
                {walletSyncMutation.isPending ? "Syncing..." : "Sync wallet"}
              </Button>
              <Button
                variant="outline"
                onClick={() => walletNewAddressMutation.mutate()}
                disabled={walletNewAddressMutation.isPending}
                type="button"
              >
                {walletNewAddressMutation.isPending ? "Generating..." : "New address"}
              </Button>
              <Button variant="outline" onClick={onGoChannels} type="button">
                Channels
              </Button>
              <Button variant="outline" onClick={onGoEvents} type="button">
                Events
              </Button>
              <Separator orientation="vertical" className="mx-1 hidden h-8 lg:block" />
	              <Button
	                variant="outline"
	                onClick={() => lockMutation.mutate()}
	                disabled={lockMutation.isPending || !controlConfigured || locked}
	                type="button"
	                title="Lock this node (requires Control API configured)"
	              >
	                Lock
	              </Button>
	              <Button
	                onClick={() => unlockMutation.mutate()}
	                disabled={unlockMutation.isPending || !controlConfigured || !locked}
	                type="button"
	                title="Unlock this node (requires Control API configured)"
	              >
	                Unlock
	              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-1 gap-3 pt-0 lg:grid-cols-3">
          <div className="rounded-md border ui-border ui-muted-10 px-3 py-2">
            <div className="text-xs font-semibold ui-muted">Main API</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span className="ui-muted">status</span>
              <HealthBadge ok={mainStatusQuery.isError ? false : mainStatusQuery.data ? true : null} />
              <span className="ui-muted">control</span>
              <HealthBadge ok={controlConfigured ? controlOk : null} />
            </div>
          </div>

          <div className="rounded-md border ui-border ui-muted-10 px-3 py-2">
            <div className="text-xs font-semibold ui-muted">Peers</div>
            <div className="mt-1 text-sm">
              {peersTotal === null ? (
                <span className="ui-muted">—</span>
              ) : (
                <>
                  <span className="font-semibold">{peersConnected ?? 0}</span>
                  <span className="ui-muted"> connected</span>
                  <span className="ui-muted"> / </span>
                  <span className="font-semibold">{peersTotal}</span>
                  <span className="ui-muted"> total</span>
                </>
              )}
            </div>
          </div>

          <div className="rounded-md border ui-border ui-muted-10 px-3 py-2">
            <div className="text-xs font-semibold ui-muted">Balances</div>
            <div className="mt-1 text-sm">
              {balancesQuery.isLoading ? (
                <span className="ui-muted">Loading...</span>
              ) : balancesQuery.isError ? (
                <span className="ui-muted">Unavailable</span>
              ) : balancesQuery.data ? (
                <div className="space-y-1 text-xs ui-muted">
                  <div>
                    <span className="font-semibold ui-foreground">Spendable</span>:{" "}
                    {balancesQuery.data.btc.onchain_spendable_sats.toString()} sats
                  </div>
                  <div>
                    <span className="font-semibold ui-foreground">Lightning</span>:{" "}
                    {balancesQuery.data.btc.lightning_total_sats.toString()} sats
                  </div>
                </div>
              ) : (
                <span className="ui-muted">—</span>
              )}
            </div>
          </div>
        </CardContent>

        {!controlConfigured ? (
          <CardContent className="pt-0">
            <div className="text-sm ui-muted">
              Control actions disabled: set `Control API base URL` and `Control token file path` for this node.
            </div>
          </CardContent>
        ) : null}

        {(unlockMutation.isError || lockMutation.isError) && (
          <CardContent className="pt-0">
            <Alert variant="destructive">
              <AlertTitle>Control operation failed</AlertTitle>
              <AlertDescription>
                {unlockMutation.isError ? errorToText(unlockMutation.error) : null}
                {unlockMutation.isError && lockMutation.isError ? <br /> : null}
                {lockMutation.isError ? errorToText(lockMutation.error) : null}
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Connectivity</CardTitle>
            <CardDescription>Identity, P2P hint, and listeners</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-sm">
            <div className="space-y-2">
              <div className="text-xs font-semibold ui-muted">Node ID</div>
              {nodeIdQuery.isLoading ? (
                <div className="text-sm ui-muted">Loading...</div>
              ) : nodeIdQuery.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Request failed</AlertTitle>
                  <AlertDescription>{errorToText(nodeIdQuery.error)}</AlertDescription>
                </Alert>
              ) : nodeIdQuery.data?.node_id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <code className="max-w-full truncate rounded-md border ui-border ui-muted-30 px-2 py-1 text-xs">
                    {nodeIdQuery.data.node_id}
                  </code>
                  <CopyButton value={nodeIdQuery.data.node_id} />
                </div>
              ) : (
                <div className="text-sm ui-muted">Unavailable</div>
              )}
            </div>

            <Separator className="my-3" />

            <div className="space-y-2">
              <div className="text-xs font-semibold ui-muted">Listening addresses</div>
              {listeningAddressesQuery.isLoading ? (
                <div className="text-sm ui-muted">Loading...</div>
              ) : listeningAddressesQuery.isError ? (
                <div className="text-sm ui-muted">Unavailable</div>
              ) : (listeningAddressesQuery.data?.addresses ?? []).length === 0 ? (
                <div className="text-sm ui-muted">No addresses reported.</div>
              ) : (
                <details className="rounded-md border ui-border ui-muted-10 px-3 py-2" open>
                  <summary className="cursor-pointer select-none text-xs font-semibold ui-muted">
                    {listeningAddressesQuery.data?.addresses?.length ?? 0} addresses
                  </summary>
                  <div className="mt-2 space-y-1">
                    {(listeningAddressesQuery.data?.addresses ?? []).slice(0, 8).map((a) => (
                      <div key={a} className="flex items-center justify-between gap-2">
                        <code className="min-w-0 truncate rounded-md border ui-border ui-muted-30 px-2 py-1 text-xs">{a}</code>
                        <CopyButton value={a} />
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Diagnostics</CardTitle>
            <CardDescription>Raw JSON responses (collapsed by default)</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <JsonDetails
                title="GET /healthz"
                data={mainHealthzQuery.data}
                isLoading={mainHealthzQuery.isLoading}
                isError={mainHealthzQuery.isError}
                error={mainHealthzQuery.error}
              />
              <JsonDetails
                title="GET /readyz"
                data={mainReadyzQuery.data}
                isLoading={mainReadyzQuery.isLoading}
                isError={mainReadyzQuery.isError}
                error={mainReadyzQuery.error}
              />
              <JsonDetails
                title="GET /api/v1/status"
                data={mainStatusQuery.data}
                isLoading={mainStatusQuery.isLoading}
                isError={mainStatusQuery.isError}
                error={mainStatusQuery.error}
              />
              {controlConfigured ? (
                <JsonDetails
                  title="GET /control/status"
                  data={controlStatusQuery.data}
                  isLoading={controlStatusQuery.isLoading}
                  isError={controlStatusQuery.isError}
                  error={controlStatusQuery.error}
                />
              ) : null}
            </div>
            <Separator className="my-3" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs ui-muted">
                Control API:{" "}
                {controlConfigured ? (
                  <span className="ui-foreground">configured</span>
                ) : (
                  <span className="ui-muted">not configured</span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={async () => {
                  await eventsClear(activeNodeId);
                }}
              >
                Clear events
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {walletSyncMutation.isError || walletNewAddressMutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Wallet action failed</AlertTitle>
          <AlertDescription>
            {walletSyncMutation.isError ? errorToText(walletSyncMutation.error) : null}
            {walletSyncMutation.isError && walletNewAddressMutation.isError ? <br /> : null}
            {walletNewAddressMutation.isError ? errorToText(walletNewAddressMutation.error) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {depositAddress ? (
        <Alert>
          <AlertTitle>Deposit address</AlertTitle>
          <AlertDescription>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="max-w-full truncate rounded-md border ui-border ui-muted-30 px-2 py-1 text-xs">{depositAddress}</code>
              <CopyButton value={depositAddress} />
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
