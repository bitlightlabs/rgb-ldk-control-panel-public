import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { OpenChannelDialog } from "@/app/components/OpenChannelDialog";
import { useNodeStore } from "@/app/stores/nodeStore";
import type { StoredEvent } from "@/lib/domain";
import {
  contextsList,
  eventsList,
  eventsStatus,
  nodeChannelClose,
  nodeChannelForceClose,
  nodeMainChannels,
} from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ChevronRight, Plus } from "lucide-react";

function truncateMiddle(s: string, head = 10, tail = 10): string {
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}...${s.slice(-tail)}`;
}

type ChannelRgbBalance = {
  assetId: string;
  localAmount: string;
  remoteAmount: string;
};

function getChannelRgbBalance(channel: unknown): ChannelRgbBalance | null {
  if (!channel || typeof channel !== "object") return null;
  const raw = (channel as { rgb_balance?: unknown }).rgb_balance;
  if (!raw || typeof raw !== "object") return null;
  const rgb = raw as {
    asset_id?: unknown;
    local_amount?: unknown;
    remote_amount?: unknown;
  };
  const assetId = typeof rgb.asset_id === "string" ? rgb.asset_id.trim() : "";
  if (!assetId) return null;
  return {
    assetId,
    localAmount:
      rgb.local_amount == null ? "0" : String(rgb.local_amount).trim() || "0",
    remoteAmount:
      rgb.remote_amount == null ? "0" : String(rgb.remote_amount).trim() || "0",
  };
}

function getChannelTypeLabel(channel: unknown): "BTC" | "BTC/RGB" {
  return getChannelRgbBalance(channel) ? "BTC/RGB" : "BTC";
}

export function ChannelsPage() {
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedUserChannelId, setSelectedUserChannelId] = useState<
    string | null
  >(null);
  const [confirmAction, setConfirmAction] = useState<"close" | "force" | null>(
    null
  );
  const [opening, setOpening] = useState<{
    userChannelId: string;
    startedAtMs: number;
    state: "opening" | "ready" | "closed";
  } | null>(null);

  const contextsQuery = useQuery({
    queryKey: ["contexts"],
    queryFn: contextsList,
    refetchInterval: 10_000,
  });
  const contexts = contextsQuery.data ?? [];

  const eventsStatusQuery = useQuery({
    queryKey: ["events_status", activeNodeId],
    queryFn: () => eventsStatus(activeNodeId!),
    enabled: !!activeNodeId,
    refetchInterval: 2_000,
    retry: 0,
  });
  const eventsRunning = !!eventsStatusQuery.data?.running;

  const channelsQuery = useQuery({
    queryKey: ["node_main_channels", activeNodeId],
    queryFn: () => nodeMainChannels(activeNodeId!),
    enabled: !!activeNodeId,
    refetchInterval: 5_000,
  });

  const eventsQuery = useQuery({
    queryKey: ["events_list", activeNodeId],
    queryFn: () => eventsList(activeNodeId!, 200),
    enabled: !!activeNodeId,
    refetchInterval: eventsRunning ? 2_000 : false,
  });

  const closeChannelMutation = useMutation({
    mutationFn: async ({
      userChannelId,
      counterpartyNodeId,
      force,
    }: {
      userChannelId: string;
      counterpartyNodeId: string;
      force: boolean;
    }) => {
      if (force) {
        return nodeChannelForceClose(activeNodeId!, {
          user_channel_id: userChannelId,
          counterparty_node_id: counterpartyNodeId,
        });
      }
      return nodeChannelClose(activeNodeId!, {
        user_channel_id: userChannelId,
        counterparty_node_id: counterpartyNodeId,
      });
    },
    onSuccess: async () => {
      await channelsQuery.refetch();
    },
  });

  const stats = useMemo(() => {
    const list = channelsQuery.data ?? [];
    const ready = list.filter((c) => c.is_channel_ready).length;
    const usable = list.filter((c) => c.is_usable).length;
    return { total: list.length, ready, usable };
  }, [channelsQuery.data]);

  const channels = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = channelsQuery.data ?? [];
    if (!q) return list;
    return list.filter((c) => {
      return (
        c.user_channel_id.toLowerCase().includes(q) ||
        c.counterparty_node_id.toLowerCase().includes(q) ||
        (c.channel_point ?? "").toLowerCase().includes(q) ||
        c.channel_value_sats.toString().toLowerCase().includes(q)
      );
    });
  }, [channelsQuery.data, filter]);

  const selectedChannel = useMemo(() => {
    if (!selectedUserChannelId) return null;
    return (
      (channelsQuery.data ?? []).find(
        (c) => c.user_channel_id === selectedUserChannelId
      ) ?? null
    );
  }, [channelsQuery.data, selectedUserChannelId]);
  const selectedChannelRgbBalance = useMemo(
    () => getChannelRgbBalance(selectedChannel),
    [selectedChannel]
  );

  const selectedEvents = useMemo(() => {
    const evs = (eventsQuery.data ?? []) as StoredEvent[];
    if (!selectedUserChannelId) return [];
    const out: StoredEvent[] = [];
    for (const ev of evs) {
      if (
        ev.event.type === "ChannelReady" &&
        ev.event.data.user_channel_id === selectedUserChannelId
      ) {
        out.push(ev);
      }
      if (
        ev.event.type === "ChannelClosed" &&
        ev.event.data.user_channel_id === selectedUserChannelId
      ) {
        out.push(ev);
      }
    }
    return out.slice(0, 10);
  }, [eventsQuery.data, selectedUserChannelId]);

  useEffect(() => {
    if (!opening || opening.state !== "opening") return;
    const evs = (eventsQuery.data ?? []) as StoredEvent[];
    for (const ev of evs) {
      if (
        ev.event.type === "ChannelReady" &&
        ev.event.data.user_channel_id === opening.userChannelId
      ) {
        setOpening((prev) => (prev ? { ...prev, state: "ready" } : prev));
        return;
      }
      if (
        ev.event.type === "ChannelClosed" &&
        ev.event.data.user_channel_id === opening.userChannelId
      ) {
        setOpening((prev) => (prev ? { ...prev, state: "closed" } : prev));
        return;
      }
    }
  }, [eventsQuery.data, opening]);

  useEffect(() => {
    if (!opening || opening.state !== "opening") return;
    const ch = (channelsQuery.data ?? []).find(
      (c) => c.user_channel_id === opening.userChannelId
    );
    if (ch?.is_channel_ready) {
      setOpening((prev) => (prev ? { ...prev, state: "ready" } : prev));
    }
  }, [channelsQuery.data, opening]);

  if (!activeNodeId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">No active node</CardTitle>
          <CardDescription>
            Select a node from the header selector.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <OpenChannelDialog
        open={openDialogOpen}
        onOpenChange={setOpenDialogOpen}
        contexts={contexts}
        sourceNodeId={activeNodeId}
        onOpened={async (resp) => {
          setOpening({
            userChannelId: resp.user_channel_id,
            startedAtMs: Date.now(),
            state: "opening",
          });
          setSelectedUserChannelId(resp.user_channel_id);
          await channelsQuery.refetch();
        }}
      />

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "force"
                ? "Force-close channel?"
                : "Close channel?"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "force"
                ? "Use only if peer is offline/uncooperative. Force closing a channel will delay the settlement of funds."
                : "Cooperative close of the selected channel."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction === "force" ? "destructive" : "default"}
              type="button"
              disabled={
                closeChannelMutation.isPending ||
                !selectedChannel ||
                !confirmAction
              }
              onClick={() => {
                if (!selectedChannel || !confirmAction) return;
                closeChannelMutation.mutate({
                  userChannelId: selectedChannel.user_channel_id,
                  counterpartyNodeId: selectedChannel.counterparty_node_id,
                  force: confirmAction === "force",
                });
                setConfirmAction(null);
              }}
            >
              {confirmAction === "force" ? "Force close" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedUserChannelId && selectedChannel ? (
        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => setSelectedUserChannelId(null)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Channel Detail</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg border ui-border p-3">
                  <div className="text-xs ">Counterparty Node ID</div>
                  <div className="mt-1 break-all font-mono text-xs">
                    {selectedChannel.counterparty_node_id}
                  </div>
                </div>
                <div className="rounded-lg border ui-border p-3">
                  <div className="text-xs ">User Channel ID</div>
                  <div className="mt-1 break-all font-mono text-xs">
                    {selectedChannel.user_channel_id}
                  </div>
                </div>
                <div className="rounded-lg border ui-border p-3">
                  <div className="text-xs ">Channel Point</div>
                  <div className="mt-1 break-all font-mono text-xs">
                    {selectedChannel.channel_point ?? "-"}
                  </div>
                </div>
                <pre className="max-h-[260px] overflow-auto rounded-md p-2 text-[11px]">
                  {JSON.stringify(selectedChannel, null, 2)}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="ui-muted">Type</span>
                  <span className="font-medium">
                    {getChannelTypeLabel(selectedChannel)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="ui-muted">Ready</span>
                  <span className="font-medium">
                    {String(selectedChannel.is_channel_ready)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="ui-muted">Usable</span>
                  <span className="font-medium">
                    {String(selectedChannel.is_usable)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="ui-muted">Value</span>
                  <span className="font-medium">
                    {selectedChannel.channel_value_sats.toString()} sats
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="ui-muted">Outbound</span>
                  <span className="font-medium">
                    {selectedChannel.outbound_capacity_msat.toString()} msat
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="ui-muted">Inbound</span>
                  <span className="font-medium">
                    {selectedChannel.inbound_capacity_msat.toString()} msat
                  </span>
                </div>
                {selectedChannelRgbBalance ? (
                  <>
                    <div className="h-px-30 my-1" />
                    <div className="flex items-center justify-between">
                      <span className="ui-muted">RGB Asset ID</span>
                      <span className="font-mono text-xs">
                        {truncateMiddle(
                          selectedChannelRgbBalance.assetId,
                          12,
                          12
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="ui-muted">RGB Local</span>
                      <span className="font-medium">
                        {selectedChannelRgbBalance.localAmount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="ui-muted">RGB Remote</span>
                      <span className="font-medium">
                        {selectedChannelRgbBalance.remoteAmount}
                      </span>
                    </div>
                  </>
                ) : null}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full"
                    disabled={closeChannelMutation.isPending}
                    onClick={() => setConfirmAction("close")}
                  >
                    Close
                  </Button>
                  <Button
                    variant="destructive"
                    type="button"
                    className="w-full"
                    disabled={closeChannelMutation.isPending}
                    onClick={() => setConfirmAction("force")}
                  >
                    Force
                  </Button>
                </div>
                {selectedEvents.length ? (
                  <div className="pt-2">
                    <div className="pb-1 text-xs font-semibold">
                      Recent events
                    </div>
                    <div className="space-y-1">
                      {selectedEvents.map((ev, idx) => (
                        <div
                          key={`${ev.received_at_ms}-${idx}`}
                          className="rounded-md border ui-border p-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold">{ev.event.type}</div>
                            <div className="font-mono text-[11px]">
                              {ev.received_at_ms}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-sm">Channel Operations</CardTitle>
                  <CardDescription>
                    total={stats.total} ready={stats.ready} usable=
                    {stats.usable}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => setOpenDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Open Channel
                  </Button>
                </div>
              </div>
              <Input
                value={filter}
                onChange={(e) => setFilter(e.currentTarget.value)}
                placeholder="Filter channels..."
              />
              {!eventsRunning ? (
                <Alert>
                  <AlertTitle>Events loop is stopped</AlertTitle>
                  <AlertDescription>
                    Channel progress updates rely on events. Start it from Nodes
                    page.
                  </AlertDescription>
                </Alert>
              ) : null}
              {opening ? (
                <Alert
                  data-testid="channel-open-state"
                  data-state={opening.state}
                >
                  <AlertTitle>
                    {opening.state === "opening"
                      ? "Opening channel..."
                      : opening.state === "ready"
                      ? "Channel ready"
                      : "Channel closed"}
                  </AlertTitle>
                  <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs ">
                      user_channel_id={opening.userChannelId}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => eventsQuery.refetch()}
                      >
                        Refresh events
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => setOpening(null)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : null}
              {closeChannelMutation.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Channel operation failed</AlertTitle>
                  <AlertDescription>
                    {errorToText(closeChannelMutation.error)}
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Channels</CardTitle>
            </CardHeader>
            <CardContent>
              {channelsQuery.isLoading ? (
                <div className="text-sm">Loading...</div>
              ) : channelsQuery.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Request failed</AlertTitle>
                  <AlertDescription>
                    {errorToText(channelsQuery.error)}
                  </AlertDescription>
                </Alert>
              ) : channels.length === 0 ? (
                <div className="text-sm">
                  {filter.trim() ? "No matches." : "No channels."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead className="text-right">Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channels.slice(0, 500).map((ch) => (
                      <TableRow
                        key={ch.user_channel_id}
                        className="cursor-pointer"
                        onClick={() =>
                          setSelectedUserChannelId(ch.user_channel_id)
                        }
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-mono text-[10px]">
                              {truncateMiddle(ch.counterparty_node_id, 14, 10)}
                            </div>
                            <div className="font-mono text-[10px]">
                              {truncateMiddle(ch.user_channel_id, 14, 10)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 ">
                            <Badge
                              className="text-[10px]"
                              variant={
                                ch.is_channel_ready ? "success" : "secondary"
                              }
                            >
                              {ch.is_channel_ready ? "READY" : "PENDING"}
                            </Badge>
                            <Badge
                              className="text-[10px]"
                              variant={ch.is_usable ? "success" : "secondary"}
                            >
                              {ch.is_usable ? "USABLE" : "NOT USABLE"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="text-[10px]" variant="secondary">
                            {getChannelTypeLabel(ch)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px]">
                          <div>
                            Value: {ch.channel_value_sats.toString()} sats
                          </div>
                          <div>
                            Out/In: {ch.outbound_capacity_msat.toString()} /{" "}
                            {ch.inbound_capacity_msat.toString()} msat
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <ChevronRight className="ml-auto h-4 w-4 " />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
