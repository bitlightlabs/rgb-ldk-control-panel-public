import { AssetExplorer } from "@/app/components/AssetExplorer";
import CopyText from "@/app/components/CopyText";
import DropMenu from "@/app/components/DropMenu";
import IconActivities from "@/app/icons/activities";
import IconExport from "@/app/icons/export";
import IconImport from "@/app/icons/import";
import IconReceive from "@/app/icons/receive";
import IconSend from "@/app/icons/send";
import { IconUtxo } from "@/app/icons/utxo";
import { useNodeStore } from "@/app/stores/nodeStore";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  nodeMainBalances,
  nodeRgbSync,
  nodeWalletNewAddress,
  nodeWalletSync,
} from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import { cn, formatAddress } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type CachedAddresses = {
  btc: string;
};

const addressCacheByNode: Record<string, CachedAddresses> = {};
let lastAddressGeneratedNodeId: string | null = null;

export function DashboardPage() {
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  // const setSelectedAssetId = useAssetsStore((s) => s.setSelectedAssetId);
  const navigate = useNavigate();
  const [depositAddress, setDepositAddress] = useState<string>("");
  const [copied, setCopied] = useState<"btc" | "">("");

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
    mutationFn: async (nodeId: string) => {
      // await nodeUnlock(activeNodeId!);
      return nodeWalletNewAddress(nodeId);
    },
    onSuccess: (resp, nodeId) => {
      setDepositAddress(resp.address);
      const cached = addressCacheByNode[nodeId] ?? { btc: "" };
      addressCacheByNode[nodeId] = { ...cached, btc: resp.address };
    },
  });

  const walletSyncMutation = useMutation({
    mutationFn: async () => {
      // await nodeUnlock(activeNodeId!);
      await nodeWalletSync(activeNodeId!);
      await nodeRgbSync(activeNodeId!);
    },
    onSuccess: () => {
      balancesQuery.refetch();

    },
  });

  useEffect(() => {
    if (!activeNodeId) return;
    setCopied("");

    const cachedAddresses = addressCacheByNode[activeNodeId];
    setDepositAddress(cachedAddresses?.btc ?? "");

    if (activeNodeId !== lastAddressGeneratedNodeId) {
      lastAddressGeneratedNodeId = activeNodeId;
      walletNewAddressMutation.mutate(activeNodeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNodeId]);

  // const l1Balance = useMemo(
  //   () => formatSats(balancesQuery.data?.btc.onchain_spendable_sats),
  //   [balancesQuery.data?.btc.onchain_spendable_sats]
  // );

  // const l2Balance = useMemo(
  //   () => formatSats(balancesQuery.data?.btc.lightning_total_sats),
  //   [balancesQuery.data?.btc.lightning_total_sats]
  // );

  // const totalBalance = useMemo(
  //   () => formatSats(balancesQuery.data?.btc.onchain_total_sats),
  //   [balancesQuery.data?.btc.onchain_total_sats]
  // );

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-background-3 px-4 py-6 rounded-3xl h-[158px] border border-background-2">
          <div className="flex h-6 items-center justify-between">
            <div className="h-6 flex gap-2 items-center">
              <span className="text-lg font-medium">🔗 On-chain</span>
              <div className="h-6 flex items-center gap-2 bg-background-3 px-2 rounded-full text-base text-secondary-foreground">
                <span>{formatAddress(depositAddress, 12)}</span>
                <CopyText text={depositAddress} />
              </div>
            </div>
            <Button
              className={cn(
                "w-6 h-6 px-0 py-0 rounded-xl",
                walletSyncMutation.isPending ? "animate-spin" : ""
              )}
              variant="destructive"
              onClick={() => walletSyncMutation.mutate()}
            >
              <RefreshCw width={16} height={16} />
            </Button>
          </div>
          <div className="mt-6">
            <span className="text-[28px] font-bold">
              {(balancesQuery.data?.btc.onchain_total_sats ?? 0) / 10 ** 8}
            </span>
            <span className="pl-2 text-lg text-secondary-foreground font-medium">
              BTC
            </span>
          </div>
        </div>
        <div className="bg-background-3 px-4 py-6 rounded-3xl h-[158px] border border-background-2">
          <div className="flex h-6 items-center">
            <span className="text-lg font-medium">⚡️ Lightning</span>
          </div>
          <div className="mt-6">
            <span className="text-[28px] font-bold">
              {(balancesQuery.data?.btc.lightning_total_sats ?? 0) / 10 ** 8}
            </span>
            <span className="pl-2 text-lg text-secondary-foreground font-medium">
              BTC
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button
          variant="white"
          size="lg"
          className="rounded-full"
          onClick={() => navigate("/dashboard/receive")}
        >
          <span className="h-5 w-5">
            <IconReceive style={{ height: "20px", width: "20px" }} />
          </span>
          <span>Receive</span>
        </Button>
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full"
          onClick={() => navigate("/dashboard/send")}
        >
          <span className="h-5 w-5">
            <IconSend style={{ height: "20px", width: "20px" }} />
          </span>
          <span>Send</span>
        </Button>
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full"
          disabled
        >
          <span className="h-5 w-5 opacity-30">
            <IconUtxo style={{ height: "20px", width: "20px" }} />
          </span>
          <span>UTXO</span>
        </Button>
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full"
          onClick={() => navigate("/activities")}
        >
          <span className="h-5 w-5">
            <IconActivities style={{ height: "20px", width: "20px" }} />
          </span>
          <span>Activities</span>
        </Button>
        <DropMenu
          className="w-11 h-11"
          direaction="horizontal"
          list={[
            {
              label: <span>Import</span>,
              icon: <span className="w-5 h-5"><IconImport /></span>,
              data: null,
              onClick: () => navigate("/rgb/import")
            },
            {
              label: <span>Export</span>,
              icon: <span className="w-5 h-5"><IconExport /></span>,
              data: null,
              onClick: () => navigate("/rgb/export")
            }
          ]}
        />
      </div>

      <div className="mt-8">
        <AssetExplorer
          title="RGB Assets"
          hideImportButton={true}
          activeNodeId={activeNodeId ?? ""}
        />
      </div>

      {(balancesQuery.isError ||
        walletSyncMutation.isError ||
        walletNewAddressMutation.isError) && (
        <Alert variant="destructive" className="mt-8">
          <AlertDescription>
            {balancesQuery.isError ? errorToText(balancesQuery.error) : null}
            {balancesQuery.isError &&
            (walletSyncMutation.isError || walletNewAddressMutation.isError) ? (
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
