import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNodeStore } from "@/app/stores/nodeStore";
import type { StoredEvent } from "@/lib/domain";
import {
  eventsList,
  eventsStatus,
  nodeChannelClose,
  nodeChannelForceClose,
  nodeMainChannels,
  nodeRgbContracts,
} from "@/lib/commands";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Ellipsis } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatAddress } from "@/lib/utils";
import { u64 } from "@/lib/sdk/u64";
import IconDelete from "@/app/icons/delete";
import CopyText from "@/app/components/CopyText";
import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import IconBtc from "@/app/icons/btc";
import { Separator } from "@/components/ui/separator";
import AssetAvatar from "@/app/components/AssetAvatar";
import IconRadioChecked from "@/app/icons/radio-checked";
import IconRadio from "@/app/icons/radio";
import Empty from "@/app/components/Empty";
import IconPlus from "@/app/icons/IconPlus";
import PageHeader from "@/app/components/PageHeader";

function truncateMiddle(s: string, head = 10, tail = 10): string {
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}...${s.slice(-tail)}`;
}

function formatRgbAtomicAmount(amount: string, precision: number): string {
  const trimmed = amount.trim();
  if (!/^\d+$/.test(trimmed)) return amount;
  if (!Number.isSafeInteger(precision) || precision <= 0) return trimmed;

  const scale = 10n ** BigInt(precision);
  const n = BigInt(trimmed);
  const integer = n / scale;
  const fractionRaw = (n % scale).toString().padStart(precision, "0");
  const fraction = fractionRaw.replace(/0+$/, "");
  return fraction ? `${integer}.${fraction}` : integer.toString();
}

type ChannelRgbBalance = {
  contractId: string;
  localAmount: string;
  remoteAmount: string;
};

function getChannelRgbBalance(channel: unknown): ChannelRgbBalance | null {
  if (!channel || typeof channel !== "object") return null;
  const raw = (channel as { rgb_balance?: unknown }).rgb_balance;
  if (!raw || typeof raw !== "object") return null;
  const rgb = raw as {
    contract_id?: unknown;
    local_amount?: unknown;
    remote_amount?: unknown;
  };
  const contractId = typeof rgb.contract_id === "string" ? rgb.contract_id.trim() : "";
  if (!contractId) return null;
  return {
    contractId,
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
  const nav = useNavigate()
  const [showDetail, setShowDetail] = useState(false);
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  // const [openDialogOpen, setOpenDialogOpen] = useState(false);
  // const [filter, setFilter] = useState("");
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

  // const contextsQuery = useQuery({
  //   queryKey: ["contexts"],
  //   queryFn: contextsList,
  //   refetchInterval: false,
  // });
  // const contexts = contextsQuery.data ?? [];

  const eventsStatusQuery = useQuery({
    queryKey: ["events_status", activeNodeId],
    queryFn: () => eventsStatus(activeNodeId!),
    enabled: !!activeNodeId,
    refetchInterval: 2_000,
    retry: false,
  });
  const eventsRunning = !!eventsStatusQuery.data?.running;

  const channelsQuery = useQuery({
    queryKey: ["node_main_channels", activeNodeId],
    queryFn: () => nodeMainChannels(activeNodeId!),
    enabled: !!activeNodeId,
    refetchInterval: 10_000,
  });

  const rgbContractsQuery = useQuery({
    queryKey: ["node_rgb_contracts", activeNodeId],
    queryFn: () => nodeRgbContracts(activeNodeId!),
    enabled: !!activeNodeId,
    refetchInterval: false,
    retry: 1,
    retryDelay: 500,
  });

  const eventsQuery = useQuery({
    queryKey: ["events_list", activeNodeId],
    queryFn: () => eventsList(activeNodeId!, 200),
    enabled: !!activeNodeId,
    refetchInterval: false,
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

  // const refreshNodeMutation = useMutation({
  //   mutationFn: async () => {
  //     if (!activeNodeId) return;
  //     await nodeWalletSync(activeNodeId);
  //     await nodeRgbSync(activeNodeId);
  //   },
  //   onSuccess: async () => {
  //     await Promise.all([
  //       channelsQuery.refetch(),
  //       eventsQuery.refetch(),
  //       eventsStatusQuery.refetch(),
  //     ]);
  //   },
  // });

  // const stats = useMemo(() => {
  //   const list = channelsQuery.data ?? [];
  //   const ready = list.filter((c) => c.is_channel_ready).length;
  //   const usable = list.filter((c) => c.is_usable).length;
  //   return { total: list.length, ready, usable };
  // }, [channelsQuery.data]);

  // const channels = useMemo(() => {
  //   const q = filter.trim().toLowerCase();
  //   const list = channelsQuery.data ?? [];
  //   if (!q) return list;
  //   return list.filter((c) => {
  //     return (
  //       c.user_channel_id.toLowerCase().includes(q) ||
  //       c.counterparty_node_id.toLowerCase().includes(q) ||
  //       (c.channel_point ?? "").toLowerCase().includes(q) ||
  //       c.channel_value_sats.toString().toLowerCase().includes(q)
  //     );
  //   });
  // }, [channelsQuery.data, filter]);

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

  const selectedChannelRgbDisplay = useMemo(() => {
    if (!selectedChannelRgbBalance) return null;
    const contract = (rgbContractsQuery.data?.contracts ?? []).find(
      (c) => c.contract_id === selectedChannelRgbBalance.contractId
    );
    const precision = contract?.precision ?? 0;
    const ticker = contract?.ticker?.trim() || "RGB";
    return {
      localAmount: formatRgbAtomicAmount(
        selectedChannelRgbBalance.localAmount,
        precision
      ),
      remoteAmount: formatRgbAtomicAmount(
        selectedChannelRgbBalance.remoteAmount,
        precision
      ),
      ticker,
    };
  }, [rgbContractsQuery.data?.contracts, selectedChannelRgbBalance]);

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

  if (!activeNodeId || channelsQuery.isPending) {
    return null
  }

  const list = channelsQuery.data ?? []
  if(list.length === 0) {
    return (
      <div>
        <PageHeader
          title="Channels"
          action={
            <Button
              variant="white"
              className="w-[150px] rounded-full"
              onClick={() => nav('/channels/open')}
            >
              <IconPlus style={{width: '20px', height: '20px'}} />
              <span>Open Channel</span>
            </Button>
          }
        />
        <Content className="mt-0 h-[630px] flex justify-center items-center">
          <Empty
            title="No Channels Found"
            subTitle="You don't have any open channels yet. Create a channel to start using Lightning Network."
            action={
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full"
                onClick={() => nav('/channels/open')}
              >
                <IconPlus style={{width: '20px', height: '20px'}} />
                <span>Open Channel</span>
              </Button>
            }
          />
        </Content>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Channels"
        action={
          <Button
            variant="white"
            className="w-[150px] rounded-full"
            onClick={() => nav('/channels/open')}
          >
            <IconPlus style={{width: '20px', height: '20px'}} />
            <span>Open Channel</span>
          </Button>
        }
      />

      {/* Channel detail */}
      {showDetail && selectedChannel ? (
        <ContentWrapper className="w-full">
          <ContentHeader title="" onBack={() => setShowDetail(false)} />

          <Content className="grid grid-cols-2 gap-10">
            <div>
              <h4 className="text-base">Channel Detail</h4>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium">Counterparty Node ID</label>
                  <div className="mt-1 break-all text-sm text-secondary-foreground">
                    {selectedChannel.counterparty_node_id}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">User Channel ID</label>
                  <div className="mt-1 break-all text-sm text-secondary-foreground">
                    {selectedChannel.user_channel_id}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Channel Point</label>
                  <div className="mt-1 break-all text-sm text-secondary-foreground">
                    {selectedChannel.channel_point ?? "-"}
                  </div>
                </div>
                <pre className="max-h-[200px] overflow-auto p-2 text-sm">
                  {JSON.stringify(selectedChannel, null, 2)}
                </pre>
              </div>
            </div>

            <div>
              <h4 className="text-base">Overview</h4>
              <div className="mt-6 text-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span>Type</span>
                  <span className="font-medium">
                    {getChannelTypeLabel(selectedChannel)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Ready</span>
                  <span className="font-medium">
                    {String(selectedChannel.is_channel_ready)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Usable</span>
                  <span className="font-medium">
                    {String(selectedChannel.is_usable)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Value</span>
                  <span className="font-medium">
                    {selectedChannel.channel_value_sats.toString()} sats
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Outbound</span>
                  <span className="font-medium">
                    {selectedChannel.outbound_capacity_msat.toString()} msat
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Inbound</span>
                  <span className="font-medium">
                    {selectedChannel.inbound_capacity_msat.toString()} msat
                  </span>
                </div>
                <div className="mt-3">
                  <Button
                    variant="destructive"
                    size="lg"
                    className="rounded-full w-full"
                    onClick={() => {
                      setSelectedUserChannelId(selectedChannel.user_channel_id)
                      setConfirmAction("close")
                    }}
                  >Close Channel</Button>
                </div>
                {selectedChannelRgbBalance ? (
                  <>
                    <div className="h-px-30 my-1" />
                    <div className="flex items-center justify-between">
                      <span className="ui-muted">RGB Contract ID</span>
                      <span className="font-mono text-xs">
                        {truncateMiddle(
                          selectedChannelRgbBalance.contractId,
                          12,
                          12
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="ui-muted">RGB Local</span>
                      <span className="font-medium text-xs">
                        {selectedChannelRgbDisplay
                          ? `${selectedChannelRgbDisplay.localAmount} ${selectedChannelRgbDisplay.ticker}`
                          : selectedChannelRgbBalance.localAmount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="ui-muted">RGB Remote</span>
                      <span className="font-medium text-xs">
                        {selectedChannelRgbDisplay
                          ? `${selectedChannelRgbDisplay.remoteAmount} ${selectedChannelRgbDisplay.ticker}`
                          : selectedChannelRgbBalance.remoteAmount}
                      </span>
                    </div>
                  </>
                ) : null}

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
              </div>
            </div>
          </Content>
        </ContentWrapper>
      ) : (
        <Content className="mt-0 px-3">
          <Table style={{minWidth: 'max-content'}}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>NODE</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead>CAPACITY</TableHead>
                <TableHead>TYPE</TableHead>
                <TableHead>OUTBOUND</TableHead>
                <TableHead>BALANCE</TableHead>
                <TableHead>RGB ASSET</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((v) => {
                  return (
                    <TableRow
                      className="h-14 cursor-pointer"
                      onClick={() => {
                        setSelectedUserChannelId(v.user_channel_id)
                        setShowDetail(true)
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                        <span>{formatAddress(v.user_channel_id, 12)}</span>
                        <CopyText text={v.user_channel_id} className="text-secondary-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>
                        {v.is_channel_ready
                          ? <Badge variant="success">READY</Badge>
                          : <Badge variant="destructive">PENDING</Badge>}
                      </TableCell>
                      <TableCell>{v.channel_value_sats} sats</TableCell>
                      <TableCell>
                        {v.rgb_balance
                          ? <Badge variant="secondary">BTC?RGB</Badge>
                          : <Badge variant="secondary">BTC</Badge>
                        }
                      </TableCell>
                      <TableCell>
                        {u64(v.outbound_capacity_msat).div(1000).toString()} sats
                      </TableCell>
                      <TableCell>
                        {u64(v.local_balance_msat ?? 0).div(1000).toString()} sats
                      </TableCell>
                      <TableCell>
                        {v.rgb_balance ? '' : '-'}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUserChannelId(v.user_channel_id)
                                setConfirmAction("close")
                              }}
                            >
                              <IconDelete className="text-error" />
                              <span className="text-error">Close Channel</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              }
            </TableBody>
          </Table>
        </Content>
      )}


      {/* close channel */}
      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <DialogContent className="w-[560px]">
          <DialogHeader>
            <DialogTitle>Are you sure you want to close the channel?</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-base font-medium">Closing this channel will settle all assets on-chain</label>
            <div>
              <div className="mt-3 bg-background-2 rounded-2xl p-4">
                <div className="flex gap-3">
                  <IconBtc width={22} height={22} />
                  <div>
                    <div className="text-lg font-medium">
                      {
                        selectedChannel?.local_balance_msat ? (
                          (BigInt(selectedChannel.local_balance_msat) / 1000n).toString()
                        ) : (
                          (BigInt(selectedChannel?.outbound_capacity_msat ?? 0) / 1000n).toString()
                        )
                      } sats
                    </div>
                    <div className="mt-1 text-sm text-secondary-foreground">
                      Receiving capacity will decrease by {
                        selectedChannel?.local_balance_msat ? (
                          (BigInt(selectedChannel.local_balance_msat) / 1000n).toString()
                        ) : (
                          (BigInt(selectedChannel?.outbound_capacity_msat ?? 0) / 1000n).toString()
                        )
                      } sats
                    </div>
                  </div>
                </div>
                {
                  selectedChannelRgbDisplay ? (
                    <>
                      <Separator className="my-4" />
                      <div className="flex gap-3">
                        <AssetAvatar className="w-[22px] h-[22px]" name={selectedChannelRgbDisplay.ticker} />
                        <div>
                          <div className="text-lg font-medium">
                            {selectedChannelRgbDisplay.localAmount}
                          </div>
                          <div className="mt-1 text-sm text-secondary-foreground">
                            Receiving capacity will decrease by 492,389 sats
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null
                }
              </div>
              <div className="mt-3 text-sm text-secondary-foreground">
                Ensure your on-chain wallet has sufficient UTXOs to receive RGB assets.
              </div>
            </div>
          </div>
          <div>
            <label className="text-base font-medium">Closure Strategy</label>
            <div className="mt-3 flex flex-col gap-3">
              <Button
                variant="destructive"
                className="h-19 px-4 py-4 justify-start rounded-2xl"
                onClick={() => setConfirmAction('close')}
              >
                <span className="self-start">
                  {confirmAction === 'close' ? <IconRadioChecked /> : <IconRadio />}
                </span>
                <div className="text-left">
                  <span className="text-lg font-medium">Normal Close</span>
                  <div className="mt-1 text-sm text-secondary-foreground">Fast and cheap. Both nodes must be online.</div>
                </div>
              </Button>
              <Button
                variant="destructive"
                className="h-19 px-4 py-4 justify-start rounded-2xl"
                onClick={() => setConfirmAction('force')}
              >
                <span className="self-start">
                  {confirmAction === 'force' ? <IconRadioChecked /> : <IconRadio />}
                </span>
                <div className="text-left">
                  <span className="text-lg font-medium">Force Close</span>
                  <div className="mt-1 text-sm text-secondary-foreground">Slow and expensive. Use only if peer is offline.</div>
                </div>
              </Button>
            </div>
          </div>
          <div>
            <details>
              <summary
                className="text-base leading-5 font-medium list-image-[url(/triangle-up.svg)]"
              >Technical Details</summary>
              <div className="bg-background-2 mt-3 p-4 rounded-2xl space-y-4">
                <div>
                  <label className="text-base">Node ID</label>
                  <div className="text-base text-secondary-foreground">{selectedChannel?.counterparty_node_id}</div>
                </div>
                <div>
                  <label className="text-base">Channel ID</label>
                  <div className="text-base text-secondary-foreground">{selectedChannel?.user_channel_id}</div>
                </div>
              </div>
            </details>
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              type="button"
              size="lg"
              className="rounded-full flex-1"
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </Button>
            <Button
              variant="white"
              type="button"
              size="lg"
              className="rounded-full flex-1"
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
              {confirmAction === "force" ? "Force Close" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
