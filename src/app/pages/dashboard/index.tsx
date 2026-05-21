import { AssetExplorer } from "@/app/components/AssetExplorer";
import CopyText from "@/app/components/CopyText";
import DropMenu from "@/app/components/DropMenu";
import IconActivities from "@/app/icons/activities";
import IconExport from "@/app/icons/export";
import IconImport from "@/app/icons/import";
import IconReceive from "@/app/icons/receive";
import IconRefresh from "@/app/icons/refresh";
import IconSend from "@/app/icons/send";
import { IconUtxo } from "@/app/icons/utxo";
import { useContextStore } from "@/app/stores/contextStore";
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
import { useNavigate } from "react-router-dom";


export function DashboardPage() {
  const navigate = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  const balancesQuery = useQuery({
    queryKey: ["node_main_balances", activeNodeId],
    queryFn: async () => {
      return nodeMainBalances(activeNodeId!);
    },
    enabled: !!activeNodeId,
    refetchInterval: 20_000,
  });

  const walletNewAddressQuery = useQuery({
    queryKey: ["wallet_new_address", activeNodeId],
    queryFn: async () => {
      return nodeWalletNewAddress(activeNodeId!);
    },
    enabled: !!activeNodeId,
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

  const address = walletNewAddressQuery.data?.address ?? '';

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-background-3 px-4 py-6 rounded-3xl h-[158px] border border-background-2">
          <div className="flex h-6 items-center justify-between">
            <div className="h-6 flex gap-2 items-center">
              <span className="text-lg font-medium">🔗 On-chain</span>
              <div className="h-6 flex items-center gap-2 bg-background-3 px-2 rounded-full text-base text-secondary-foreground">
                <span>{formatAddress(address, 12)}</span>
                <CopyText text={address} />
              </div>
            </div>
            <Button
              className={cn(
                "w-6 h-6 px-0 py-0 rounded-xl",
                walletSyncMutation.isPending ? "animate-spin" : ""
              )}
              variant="ghost"
              onClick={() => walletSyncMutation.mutate()}
            >
              <IconRefresh width={16} height={16} />
            </Button>
          </div>
          <div className="mt-6 h-[34px]">
            <span className="text-[28px] font-bold">
              {(balancesQuery.data?.btc.onchain_total_sats ?? 0) / 10 ** 8}
              {}
            </span>
            <span className="pl-2 text-lg text-secondary-foreground font-medium">
              BTC
            </span>
          </div>
          <div className="mt-2 text-base text-secondary-foreground">
            = {balancesQuery.data?.btc.onchain_total_sats} sats
          </div>
        </div>
        <div className="bg-background-3 px-4 py-6 rounded-3xl h-[158px] border border-background-2">
          <div className="flex h-6 items-center">
            <span className="text-lg font-medium">⚡️ Lightning</span>
          </div>
          <div className="mt-6 h-[34px]">
            <span className="text-[28px] font-bold">
              {(balancesQuery.data?.btc.lightning_total_sats ?? 0) / 10 ** 8}
            </span>
            <span className="pl-2 text-lg text-secondary-foreground font-medium">
              BTC
            </span>
          </div>
          <div className="mt-2 text-base text-secondary-foreground">
            = {balancesQuery.data?.btc.lightning_total_sats} sats
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
        {/* <Button
          variant="destructive"
          size="lg"
          className="rounded-full"
          onClick={() => navigate("/dashboard/send/send-old")}
        >
          <span className="h-5 w-5">
            <IconSend style={{ height: "20px", width: "20px" }} />
          </span>
          <span>Sendold</span>
        </Button> */}
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full disabled:bg-background-2"
          disabled
          onClick={() => navigate("/dashboard/utxo")}
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
          onClick={() => navigate("/dashboard/activities")}
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
              onClick: () => navigate("/dashboard/rgb/import")
            },
            {
              label: <span>Export</span>,
              icon: <span className="w-5 h-5"><IconExport /></span>,
              data: null,
              onClick: () => navigate("/dashboard/rgb/export")
            }
          ]}
        />
      </div>

      <div className="mt-8">
        <AssetExplorer />
      </div>

      {(balancesQuery.isError ||
        walletSyncMutation.isError ||
        walletNewAddressQuery.isError) && (
        <Alert variant="destructive" className="mt-8">
          <AlertDescription>
            {balancesQuery.isError ? errorToText(balancesQuery.error) : null}

            {walletSyncMutation.isError
              ? errorToText(walletSyncMutation.error)
              : null}

            {walletNewAddressQuery.isError
              ? errorToText(walletNewAddressQuery.error)
              : null}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
