import AssetAvatar from "@/app/components/AssetAvatar";
import AssetBalance from "@/app/components/AssetBalance";
import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import CopyText from "@/app/components/CopyText";
import IconExport from "@/app/icons/export";
import IconImport from "@/app/icons/import";
import IconReceive from "@/app/icons/receive";
import IconSend from "@/app/icons/send";
import { useNodeStore } from "@/app/stores/nodeStore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { nodeRgbContracts } from "@/lib/commands";
import { u64 } from "@/lib/sdk/u64";
import { formatAddress } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

export function AssetDetailPage() {
  const nav = useNavigate()
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const [search] = useSearchParams()

  const contractId = search.get("contract_id") ?? "";

  const rgbContractsQuery = useQuery({
    queryKey: ["dashboard_rgb_contracts", activeNodeId],
    queryFn: () => {
      return nodeRgbContracts(activeNodeId!);
    },
    enabled: !!activeNodeId
  });

  const contracts = rgbContractsQuery.data?.contracts ?? []
  const asset = contracts.find(c => c.contract_id === contractId)

  if(rgbContractsQuery.isLoading) {
    return (
      <Skeleton />
    )
  }

  if(!asset) {
    return null
  }

  return (
    <ContentWrapper className="w-full">
      <ContentHeader title={asset.name ?? ''} onBack={() => nav(-1)} />
      <Content>
        <div className="h-13 flex items-center gap-4">
          <AssetAvatar className="w-13 h-13 text-lg" name={asset.name ?? ''} />
          <div>
            <div className="text-xl font-bold leading-7">{asset.name}</div>
            <div className="flex gap-3 items-center text-base text-secondary-foreground">
              <span>{formatAddress(asset.contract_id)}</span>
              <CopyText text={asset.contract_id} className="text-secondary-foreground" />
            </div>
          </div>
        </div>

        <div className="mt-6 bg-background rounded-2xl p-4 text-base font-medium space-y-4">
          <div className="flex h-5 justify-between items-center ">
            <span>Available</span>
            <span>
              <AssetBalance
                nodeId={activeNodeId ?? ''}
                contractId={asset.contract_id}
                precision={asset.precision ?? 0}
              />
              <span className="pl-2">{asset.name}</span>
            </span>
          </div>
          {/* <div className="flex h-5 justify-between items-center">
            <span>Unconfirmed</span>
            <span>0</span>
          </div> */}
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full flex-1"
            onClick={() => nav("/dashboard/receive")}
          >
            <IconReceive />
            <span>Receive</span>
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full flex-1"
            onClick={() => nav("/dashboard/send")}
          >
            <IconSend />
            <span>Send</span>
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full flex-1"
            onClick={() => nav('/rgb/import')}
          >
            <IconImport />
            <span>Import</span>
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full flex-1"
            onClick={() => nav('/rgb/export')}
          >
            <IconExport />
            <span>Export</span>
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="p-5 rounded-3xl bg-background-3/50">
            <h4 className="text-lg font-medium">About {asset.name}</h4>
            <div className="mt-6 flex gap-3">
              <div className="w-[132px]">
                <label className="text-sm text-secondary-foreground">RGB20 Ticker</label>
                <div className="text-base mt-1">{asset.ticker}</div>
              </div>
              <div className="">
                <label className="text-sm text-secondary-foreground">Token Name</label>
                <div className="text-base mt-1">{asset.name}</div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <div className="w-[132px]">
                <label className="text-sm text-secondary-foreground">Total Apply</label>
                <div className="text-base mt-1">{u64(asset.issued_supply ?? 0).div(10 ** (asset.precision ?? 0)).toString()}</div>
              </div>
              <div className="">
                <label className="text-sm text-secondary-foreground">Precision</label>
                <div className="text-base mt-1">{asset.precision}</div>
              </div>
            </div>
          </div>
        </div>
      </Content>
    </ContentWrapper>
  )
}
