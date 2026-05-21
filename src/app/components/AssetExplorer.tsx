import { useQuery } from "@tanstack/react-query";
import { nodeRgbContracts } from "@/lib/commands";
import AssetBalance from "./AssetBalance";
import { RgbContractDto } from "@/lib/sdk/types";
import AssetAvatar from "./AssetAvatar";
import { useNavigate } from "react-router-dom";
import { useContextStore } from "../stores/contextStore";

export type Asset = RgbContractDto;

export function AssetExplorer() {
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  const nav = useNavigate()

  const rgbContractsQuery = useQuery({
    queryKey: ["dashboard_rgb_contracts", activeNodeId],
    queryFn: async () => {
      return nodeRgbContracts(activeNodeId!);
    },
    enabled: !!activeNodeId,
  });

  const contracts = rgbContractsQuery.data?.contracts ?? [];

  const table = (
    <div className="mt-6">
      <div className="flex justify-between h-7 items-center">
        <div className="text-xs text-secondary-foreground">ASSET</div>
        <div className="text-right text-xs text-secondary-foreground">BALANCE</div>
      </div>
      <div className="space-y-1">
        {
          contracts.map((asset) => (
            <div
              key={asset.contract_id}
              className="cursor-pointer flex justify-between items-center py-3"
              role="button"
              // onClick={() => handleSelectAsset(asset.contract_id)}
              onClick={() => nav('/dashboard/asset-detail?contract_id=' + asset.contract_id)}
            >
              <div className="h-10 flex gap-3">
                <AssetAvatar className="w-10 h-10"  name={asset.name ?? ""} />
                <div>
                  <div className="text-base font-medium">{asset.name}</div>
                  <div className="text-sm text-secondary-foreground">{asset.ticker}</div>
                </div>
              </div>
              <div>
                <AssetBalance
                  nodeId={activeNodeId ?? ''}
                  contractId={asset.contract_id}
                  precision={asset.precision ?? 0}
                />
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );

  return (
    <>
      <div className="h-full bg-background-3 rounded-3xl p-5 border border-background-2">
        <div className="flex justify-between h-[22px] items-center">
          <span className="font-medium">RGB Assets</span>
          <div className="flex gap-3">
            {/* <Button
              disabled={rgbContractsQuery.isPending}
              size="icon"
              variant="destructive"
              aria-label="Sync wallet"
              className="rounded-full"
              onClick={() => {
                rgbContractsQuery.refetch();
              }}
            >
              <RefreshCw />
            </Button> */}

            {/* <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={rgbContractsQuery.isPending}
                  size="icon"
                  variant="destructive"
                  aria-label="Sync wallet"
                  className="rounded-full"
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => nav('/dashboard/rgb/import')}
                >
                  <IconImport />
                  <span>Import</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => nav('/dashboard/rgb/export')}
                >
                  <IconExport />
                  <span>Export</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu> */}
          </div>
        </div>
        {
          rgbContractsQuery.isPending || rgbContractsQuery.isRefetching ? (
            <div className="text-base py-20 text-center">Loading...</div>
          ) : contracts.length > 0 ? table : (
            <div className="py-[149px] text-center">
              <h4 className="text-base">No RGB assets found.</h4>
              <div className="mt-1 text-xs text-secondary-foreground">Receive an asset or import to get started.</div>
            </div>
          )
        }
      </div>

      {/* issuers */}
      {/* {showIssue ? (
        <IssueAsset
          onClose={() => setShowIssue(false)}
          activeNodeId={activeNodeId}
          onSuccess={() => rgbContractsQuery.refetch()}
        />
      ) : null} */}

      {/* Import Contract */}
      {/* {showImport ? (
        <ImportOnchainAsset
          activeNodeId={activeNodeId}
          onClose={() => setShowImport(false)}
          onSuccess={() => rgbContractsQuery.refetch()}
        />
      ) : null} */}

      {/* Import Contract from consignment file */}
      {/* {showImportLocalContract ? (
        <ImportLocalContract
          onClose={() => setShowImportlocalContract(false)}
          activeNodeId={activeNodeId}
          onSuccess={() => rgbContractsQuery.refetch()}
        />
      ) : null} */}

      {/* {showAcceptDialog ? (
        <AcceptOnChainPaymentDialog
          activeNodeId={activeNodeId}
          onSuccess={() => rgbContractsQuery.refetch()}
          onClose={() => setShowAcceptDialog(false)}
        />
      ) : null} */}
    </>
  );
}
