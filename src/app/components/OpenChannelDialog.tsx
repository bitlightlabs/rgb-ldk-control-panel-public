import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { NodeContext } from "@/lib/domain";
import type { OpenChannelRequest, OpenChannelResponse } from "@/lib/sdk/types";
import {
  nodeChannelOpen,
  nodeMainNodeId,
  nodeMainPeers,
  nodeMainPeersConnect,
  nodeRgbSync,
  nodeRgbContracts,
} from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import { u64 } from "@/lib/sdk";

function isDigits(s: string): boolean {
  return /^[0-9]+$/.test(s.trim());
}

const MIN_RGB_CHANNEL_SATS = 1_000_000;

function buildConsignmentTemplate(base: string): string {
  const trimmed = base.trim();
  if (!trimmed) return "";
  if (trimmed.includes("{txid}")) return trimmed;
  if (trimmed.startsWith("file://")) {
    const path = trimmed.slice("file://".length);
    const clean = path.endsWith("/") ? path.slice(0, -1) : path;
    return `file://${clean}/{txid}`;
  }
  const clean = trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
  return `${clean}/{txid}?format=zip`;
}

function defaultRgbContextData(source: NodeContext | null): string {
  if (!source) return "";
  if (source.rgb_consignment_base_url) {
    return buildConsignmentTemplate(source.rgb_consignment_base_url);
  }
  return "";
}

export function OpenChannelDialog({
  open,
  onOpenChange,
  contexts,
  sourceNodeId,
  onOpened,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contexts: NodeContext[];
  sourceNodeId: string;
  onOpened: (resp: OpenChannelResponse) => void | Promise<void>;
}) {
  const source = useMemo(
    () => contexts.find((c) => c.node_id === sourceNodeId) ?? null,
    [contexts, sourceNodeId]
  );
  const candidates = useMemo(
    () => contexts.filter((c) => c.node_id !== sourceNodeId),
    [contexts, sourceNodeId]
  );

  const [targetMode, setTargetMode] = useState<"context" | "external">(
    "context"
  );
  const [targetContextId, setTargetContextId] = useState<string | null>(null);
  const targetContext = useMemo(
    () => candidates.find((c) => c.node_id === targetContextId) ?? null,
    [candidates, targetContextId]
  );

  const targetNodeIdQuery = useQuery({
    queryKey: ["open_channel_target_node_id", targetContextId],
    queryFn: () => nodeMainNodeId(targetContextId!),
    enabled: targetMode === "context" && !!targetContextId,
  });

  const [peerNodeId, setPeerNodeId] = useState("");
  const [address, setAddress] = useState("");
  const [channelAmountSats, setChannelAmountSats] = useState("200000"); // 0.002 BTC default
  const [announce, setAnnounce] = useState(false);
  const [connectFirst, setConnectFirst] = useState(true);
  const [persistPeer, setPersistPeer] = useState(false);
  const [rgbEnabled, setRgbEnabled] = useState(false);
  const [rgbAssetId, setRgbAssetId] = useState("");
  const [rgbAssetAmount, setRgbAssetAmount] = useState("100");
  const rgbContextData = useMemo(() => defaultRgbContextData(source), [source]);
  const rgbContractsQuery = useQuery({
    queryKey: ["open_channel_rgb_contracts", sourceNodeId],
    queryFn: () => nodeRgbContracts(sourceNodeId),
    enabled: open && rgbEnabled && !!sourceNodeId,
  });

  useEffect(() => {
    if (!open) return;
    setTargetMode("context");
    setTargetContextId(null);
    setPeerNodeId("");
    setAddress("");
    setChannelAmountSats("200000");
    setAnnounce(false);
    setConnectFirst(true);
    setPersistPeer(false);
    setRgbEnabled(false);
    setRgbAssetId("");
    setRgbAssetAmount("100");
  }, [open]);

  useEffect(() => {
    if (targetMode !== "context") return;
    if (!targetNodeIdQuery.data?.node_id) return;
    if (peerNodeId.trim()) return;
    setPeerNodeId(targetNodeIdQuery.data.node_id);
  }, [peerNodeId, targetMode, targetNodeIdQuery.data?.node_id]);

  useEffect(() => {
    if (targetMode !== "context") return;
    if (!targetContext?.p2p_listen) return;
    if (address.trim()) return;
    setAddress(targetContext.p2p_listen);
  }, [address, targetContext?.p2p_listen, targetMode]);

  useEffect(() => {
    if (!rgbEnabled) return;
    if (
      isDigits(channelAmountSats) &&
      Number(channelAmountSats) < MIN_RGB_CHANNEL_SATS
    ) {
      setChannelAmountSats(String(MIN_RGB_CHANNEL_SATS));
    }
  }, [channelAmountSats, rgbEnabled]);
  useEffect(() => {
    if (!rgbEnabled) return;
    if (rgbAssetId.trim()) return;
    const first = rgbContractsQuery.data?.contracts?.[0];
    if (first?.asset_id) {
      setRgbAssetId(first.asset_id);
    }
  }, [rgbAssetId, rgbContractsQuery.data?.contracts, rgbEnabled]);
  const selectedRgbContract = useMemo(
    () =>
      (rgbContractsQuery.data?.contracts ?? []).find(
        (c) => c.asset_id === rgbAssetId
      ) ?? null,
    [rgbAssetId, rgbContractsQuery.data?.contracts]
  );

  const openMutation = useMutation({
    mutationFn: async () => {
      if (rgbEnabled && targetMode === "context" && targetContextId) {
        await nodeRgbSync(targetContextId);
        const targetContracts = await nodeRgbContracts(targetContextId);
        const targetHasAsset = (targetContracts.contracts ?? []).some(
          (c) => c.asset_id === rgbAssetId.trim()
        );
        if (!targetHasAsset) {
          throw new Error(
            "Target node is missing this RGB asset. Import/sync the contract on the target node first."
          );
        }
      }

      if (connectFirst) {
        const peerId = peerNodeId.trim();
        const addr = address.trim();
        const peers = await nodeMainPeers(sourceNodeId);
        const alreadyConnected = peers.some(
          (p) => p.node_id === peerId && p.is_connected
        );
        if (!alreadyConnected) {
          await nodeMainPeersConnect(sourceNodeId, {
            node_id: peerId,
            address: addr,
            persist: persistPeer,
          });
        }
      }

      const selectAsset =
        rgbContractsQuery.data?.contracts.find(
          (c) => c.asset_id === rgbAssetId
        ) ?? null;
      const precision = selectAsset?.precision ?? 0;

      const req: OpenChannelRequest = {
        node_id: peerNodeId.trim(),
        address: address.trim(),
        channel_amount_sats: u64(channelAmountSats.trim()),
        announce,
        push_to_counterparty_msat: null,
        rgb: rgbEnabled
          ? {
              asset_id: rgbAssetId.trim(),
              asset_amount: u64(
                Number(rgbAssetAmount.trim()) * 10 ** precision
              ),
              color_context_data: rgbContextData.trim(),
            }
          : null,
      };
      return nodeChannelOpen(sourceNodeId, req);
    },
    onSuccess: async (resp) => {
      await onOpened(resp);
      onOpenChange(false);
    },
  });

  const validationError = useMemo(() => {
    if (!source) return "Missing source node.";
    if (targetMode === "context" && !targetContextId)
      return "Pick a target node.";
    if (!peerNodeId.trim()) return "Missing peer node_id.";
    if (!address.trim()) return "Missing peer address (ip:port).";
    if (!channelAmountSats.trim()) return "Missing channel amount (sats).";
    if (!isDigits(channelAmountSats))
      return "Channel amount must be a whole number (sats).";
    if (channelAmountSats.trim() === "0") return "Channel amount must be > 0.";
    if (rgbEnabled) {
      if (
        isDigits(channelAmountSats) &&
        Number(channelAmountSats) < MIN_RGB_CHANNEL_SATS
      ) {
        return `RGB channels require at least ${MIN_RGB_CHANNEL_SATS} sats channel amount.`;
      }
      if (!rgbAssetId.trim()) return "Missing RGB asset_id.";
      if (!rgbAssetAmount.trim()) return "Missing RGB asset amount.";
      if (!isDigits(rgbAssetAmount))
        return "RGB asset amount must be a whole number.";
      if (rgbAssetAmount.trim() === "0") return "RGB asset amount must be > 0.";
      if (!rgbContextData.trim()) return "Missing RGB color_context_data.";
    }
    return null;
  }, [
    address,
    channelAmountSats,
    peerNodeId,
    rgbAssetAmount,
    rgbAssetId,
    rgbContextData,
    rgbEnabled,
    source,
    targetContextId,
    targetMode,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Open channel</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto grid grid-cols-1 gap-4">
          <div className="grid gap-3">
            <Label>Target node</Label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={targetMode === "context" ? "default" : "outline"}
                type="button"
                onClick={() => setTargetMode("context")}
              >
                Local node
              </Button>
              <Button
                size="sm"
                variant={targetMode === "external" ? "default" : "outline"}
                type="button"
                onClick={() => setTargetMode("external")}
              >
                External node
              </Button>
            </div>
            {targetMode === "context" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className="justify-between"
                    data-testid="open-channel-target-trigger"
                  >
                    <span className="truncate">
                      {targetContext
                        ? targetContext.display_name
                        : candidates.length
                        ? "Pick a node…"
                        : "No other nodes"}
                    </span>
                    <span className="ml-2 shrink-0 font-mono text-xs ui-muted">
                      {targetContext ? targetContext.node_id.slice(0, 12) : ""}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[520px]"
                  align="start"
                  data-testid="open-channel-target-menu"
                >
                  <DropdownMenuLabel>Pick target</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {candidates.length === 0 ? (
                    <DropdownMenuItem disabled>
                      Need at least 2 nodes
                    </DropdownMenuItem>
                  ) : (
                    candidates.map((c) => (
                      <DropdownMenuItem
                        key={c.node_id}
                        onClick={() => setTargetContextId(c.node_id)}
                        data-testid={`open-channel-target-item-${c.node_id}`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm">
                            {c.display_name}
                          </div>
                          <div className="truncate font-mono text-xs ui-muted">
                            {c.main_api_base_url}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
                <div
                  style={{
                    position: "absolute",
                    left: "-10000px",
                    top: 0,
                    width: 1,
                    height: 1,
                    opacity: 1,
                  }}
                  aria-hidden="true"
                >
                  {candidates.map((c) => (
                    <button
                      key={c.node_id}
                      type="button"
                      data-testid={`open-channel-target-hack-${c.node_id}`}
                      onClick={() => setTargetContextId(c.node_id)}
                    />
                  ))}
                </div>
              </DropdownMenu>
            ) : (
              <div className="text-xs ui-muted">
                Provide a peer node_id + address for any external LN node.
              </div>
            )}
          </div>

          <div className="grid gap-3">
            <Label htmlFor="peer_node_id">Peer node_id</Label>
            <Input
              id="peer_node_id"
              className="font-mono"
              value={peerNodeId}
              onChange={(e) => setPeerNodeId(e.currentTarget.value)}
              placeholder="02... (secp256k1 pubkey hex)"
            />
            {targetNodeIdQuery.isError ? (
              <div className="text-xs ui-danger">
                {errorToText(targetNodeIdQuery.error)}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3">
            <Label htmlFor="peer_address">Peer address</Label>
            <Input
              id="peer_address"
              className="font-mono"
              value={address}
              onChange={(e) => setAddress(e.currentTarget.value)}
              placeholder="127.0.0.1:9735"
            />
          </div>

          <div className="grid gap-3">
            <Label htmlFor="channel_amount_sats">Channel amount (sats)</Label>
            <Input
              id="channel_amount_sats"
              className="font-mono"
              value={channelAmountSats}
              onChange={(e) => setChannelAmountSats(e.currentTarget.value)}
              placeholder="e.g. 200000"
              inputMode="numeric"
            />
            {rgbEnabled ? (
              <div className="text-xs ui-muted">
                RGB channel minimum: {MIN_RGB_CHANNEL_SATS} sats
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 rounded-md border ui-border p-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold">Announce</div>
              <div className="text-xs ui-muted">
                Disable for local/dev channels.
              </div>
            </div>
            <Button
              variant={announce ? "default" : "outline"}
              type="button"
              size="sm"
              onClick={() => setAnnounce((v) => !v)}
              data-testid="open-channel-announce-toggle"
            >
              {announce ? "ON" : "OFF"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border ui-border p-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold">Peer connection</div>
              <div className="text-xs ui-muted">
                Connect the peer before opening (recommended).
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={persistPeer ? "default" : "outline"}
                type="button"
                size="sm"
                disabled={!connectFirst}
                onClick={() => setPersistPeer((v) => !v)}
                title="Persist peer entry on disk (source node)"
              >
                {persistPeer ? "Persist" : "No persist"}
              </Button>
              <Button
                variant={connectFirst ? "default" : "outline"}
                type="button"
                size="sm"
                onClick={() => setConnectFirst((v) => !v)}
              >
                {connectFirst ? "Connect first" : "Skip connect"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 rounded-md border ui-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="text-sm font-semibold">RGB channel</div>
                <div className="text-xs ui-muted">
                  Attach RGB asset info + consignment context.
                </div>
              </div>
              <Button
                variant={rgbEnabled ? "default" : "outline"}
                type="button"
                size="sm"
                onClick={() => setRgbEnabled((v) => !v)}
                data-testid="open-channel-rgb-toggle"
              >
                {rgbEnabled ? "ON" : "OFF"}
              </Button>
            </div>
            {rgbEnabled ? (
              <div className="grid gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="rgb_asset_id">Asset</Label>
                  <Select
                    value={rgbAssetId || undefined}
                    onValueChange={setRgbAssetId}
                    disabled={
                      rgbContractsQuery.isPending ||
                      rgbContractsQuery.isError ||
                      (rgbContractsQuery.data?.contracts?.length ?? 0) === 0
                    }
                  >
                    <SelectTrigger
                      id="rgb_asset_id"
                      className="w-full"
                      data-testid="open-channel-rgb-asset-id"
                    >
                      <SelectValue
                        placeholder={
                          rgbContractsQuery.isPending
                            ? "Loading RGB assets..."
                            : rgbContractsQuery.isError
                            ? "Failed to load RGB assets"
                            : "Pick RGB asset..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(rgbContractsQuery.data?.contracts ?? []).map((c) => (
                        <SelectItem
                          key={c.contract_id}
                          value={c.asset_id}
                          data-testid={`open-channel-rgb-asset-item-${c.contract_id}`}
                        >
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {rgbContractsQuery.isError ? (
                    <div className="text-xs ui-danger">
                      {errorToText(rgbContractsQuery.error)}
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rgb_asset_amount">asset amount</Label>
                  <Input
                    id="rgb_asset_amount"
                    className="font-mono"
                    value={rgbAssetAmount}
                    onChange={(e) => setRgbAssetAmount(e.currentTarget.value)}
                    inputMode="numeric"
                    placeholder="e.g. 100"
                    data-testid="open-channel-rgb-asset-amount"
                  />
                </div>
              </div>
            ) : null}
          </div>

          {validationError ? (
            <Alert variant="destructive" data-testid="open-channel-validation">
              <AlertTitle>Cannot open channel</AlertTitle>
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          ) : null}

          {openMutation.isError ? (
            <Alert variant="destructive" data-testid="open-channel-error">
              <AlertTitle>Open failed</AlertTitle>
              <AlertDescription>
                {errorToText(openMutation.error)}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={openMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={openMutation.isPending || !!validationError}
            onClick={() => openMutation.mutate()}
          >
            {openMutation.isPending ? "Opening..." : "Open channel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
