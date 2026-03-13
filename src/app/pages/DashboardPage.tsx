import { AssetExplorer } from "@/app/components/AssetExplorer";
import { ReceiveBtcPage } from "@/app/pages/ReceiveBtcPage";
import { SendBtcPage } from "@/app/pages/SendBtcPage";
import { useAssetsStore } from "@/app/stores/assetsStore";
import { useNavStore } from "@/app/stores/navStore";
import { useNodeStore } from "@/app/stores/nodeStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  nodeMainBalances,
  nodeRgbNewAddress,
  nodeRgbSync,
  nodeWalletNewAddress,
  nodeWalletSync,
} from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Copy,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function formatSats(value: unknown): string {
  if (value == null) return "0";
  return `${value.toString()} sats`;
}

export function DashboardPage() {
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const setActiveTab = useNavStore((s) => s.setActiveTab);
  const setSelectedAssetId = useAssetsStore((s) => s.setSelectedAssetId);
  const [depositAddress, setDepositAddress] = useState<string>("");
  const [rgbAddress, setRgbAddress] = useState<string>("");
  const [copied, setCopied] = useState<'btc' | 'rgb' | ''>('');
  const [flowOpen, setFlowOpen] = useState<"none" | "receive" | "send">(
    "none"
  );

  const balancesQuery = useQuery({
    queryKey: ["node_main_balances", activeNodeId],
    queryFn: async () => {
      // await nodeUnlock(activeNodeId!);
      return nodeMainBalances(activeNodeId!);
    },
    enabled: !!activeNodeId,
    refetchInterval: 20_000,
  });

  const walletNewAddressMutation = useMutation({
    mutationFn: async () => {
      // await nodeUnlock(activeNodeId!);
      return nodeWalletNewAddress(activeNodeId!);
    },
    onSuccess: (resp) => {
      setDepositAddress(resp.address);
    },
  });

  const walletNewRGBAddressMutation = useMutation({
    mutationFn: async () => {
      return nodeRgbNewAddress(activeNodeId!);
    },
    onSuccess: (resp) => {
      setRgbAddress(resp.address);
    },
  });

  const walletSyncMutation = useMutation({
    mutationFn: async () => {
      // await nodeUnlock(activeNodeId!);
      await nodeWalletSync(activeNodeId!);
      await nodeRgbSync(activeNodeId!);
    },
    onSuccess: async () => {
      await balancesQuery.refetch();
    },
  });

  useEffect(() => {
    if (!activeNodeId) return;
    setDepositAddress("");
    setCopied('');
    setFlowOpen("none");
    walletSyncMutation.mutate();
    walletNewAddressMutation.mutate();
    walletNewRGBAddressMutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNodeId]);

  const l1Balance = useMemo(
    () => formatSats(balancesQuery.data?.btc.onchain_spendable_sats),
    [balancesQuery.data?.btc.onchain_spendable_sats]
  );

  const l2Balance = useMemo(
    () => formatSats(balancesQuery.data?.btc.lightning_total_sats),
    [balancesQuery.data?.btc.lightning_total_sats]
  );

  const totalBalance = useMemo(
    () => formatSats(balancesQuery.data?.btc.onchain_total_sats),
    [balancesQuery.data?.btc.onchain_total_sats]
  );

  if (flowOpen !== "none") {
    return (
      <div className="space-y-4">
        {flowOpen === "receive" ? (
          <ReceiveBtcPage onBackRoot={() => setFlowOpen("none")} />
        ) : (
          <SendBtcPage onBackRoot={() => setFlowOpen("none")} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-4">
          <div className="rounded-xl border ui-border p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs ui-muted">Total Balance</div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => walletSyncMutation.mutate()}
                disabled={walletSyncMutation.isPending}
                className="h-7 w-7"
                aria-label="Sync wallet"
                title="Sync wallet"
              >
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5",
                    walletSyncMutation.isPending && "animate-spin"
                  )}
                />
              </Button>
            </div>
            <div className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
              {balancesQuery.isLoading ? "Loading..." : totalBalance}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-md border ui-border bg-background/60 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide ui-muted">
                  Spendable
                </div>
                <div className="mt-1 text-sm font-medium">
                  {balancesQuery.isLoading ? "Loading..." : l1Balance}
                </div>
              </div>
              <div className="rounded-md border ui-border bg-background/60 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide ui-muted">
                  Lightning
                </div>
                <div className="mt-1 text-sm font-medium">
                  {balancesQuery.isLoading ? "Loading..." : l2Balance}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border ui-border ui-muted-10 p-3">
            <div className="text-xs ui-muted">Address</div>
            <div className="mt-2 flex items-center gap-2">
              <code className="max-w-full flex-1 truncate rounded-md ui-muted-30 px-2 py-1 text-xs">
                Btc Address: {depositAddress || "Generating wallet address..."}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={!depositAddress}
                onClick={async () => {
                  if (!depositAddress) return;
                  await navigator.clipboard.writeText(depositAddress);
                  setCopied('btc');
                  window.setTimeout(() => setCopied(''), 1200);
                }}
                aria-label="Copy address"
              >
                {copied === 'btc' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="max-w-full flex-1 truncate rounded-md ui-muted-30 px-2 py-1 text-xs">
                Rgb Address: {rgbAddress || "Generating wallet address..."}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={!rgbAddress}
                onClick={async () => {
                  if (!rgbAddress) return;
                  await navigator.clipboard.writeText(rgbAddress);
                  setCopied('rgb');
                  window.setTimeout(() => setCopied(''), 1200);
                }}
                aria-label="Copy address"
              >
                {copied === 'rgb' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border ui-border ui-muted-10 p-3">
          <div className="text-xs font-medium uppercase tracking-wide ui-muted">
            Actions
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => setFlowOpen("send")}
              className="w-full justify-start"
            >
              <ArrowUpRight className="h-4 w-4" />
              Send
            </Button>
            <Button
              type="button"
              className="w-full justify-start"
              onClick={() => setFlowOpen("receive")}
            >
              <ArrowDownLeft className="h-4 w-4" />
              Receive
            </Button>
          </div>
        </div>
      </div>

      <AssetExplorer
        title="RGB Assets"
        inlineDetails={false}
        onSelectAsset={(assetId) => {
          setSelectedAssetId(assetId, "dashboard");
          setActiveTab("assets");
        }}
        activeNodeId={activeNodeId ?? ''}
      />

      {(balancesQuery.isError ||
        walletSyncMutation.isError ||
        walletNewAddressMutation.isError) && (
        <Alert variant="destructive">
          <AlertTitle>Wallet request failed</AlertTitle>
          <AlertDescription>
            {balancesQuery.isError ? errorToText(balancesQuery.error) : null}
            {balancesQuery.isError &&
            (
              walletSyncMutation.isError ||
              walletNewAddressMutation.isError) ? (
              <br />
            ) : null}
            {walletSyncMutation.isError
              ? errorToText(walletSyncMutation.error)
              : null}
            {walletSyncMutation.isError && walletNewAddressMutation.isError ? (
              <br />
            ) : null}
            {walletNewAddressMutation.isError
              ? errorToText(walletNewAddressMutation.error)
              : null}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
