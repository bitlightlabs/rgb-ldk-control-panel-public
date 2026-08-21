import AssetBalance from "./AssetBalance";
import { RgbContractDto } from "@/lib/sdk/types";
import AssetAvatar from "./AssetAvatar";
import { useNavigate } from "react-router-dom";
import { useContextStore } from "../stores/contextStore";
import { useNodeRgbContractsQuery } from "@/app/queries";
import IssueAsset from "./IssueAsset";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export type Asset = RgbContractDto;

export function AssetExplorer() {
  const [showIssue, setShowIssue] = useState(false);
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  const nav = useNavigate();

  const rgbContractsQuery = useNodeRgbContractsQuery(activeNodeId, {
    staleTime: 30_000,
  });

  const contracts = rgbContractsQuery.data?.contracts ?? [];
  const isInitialLoading =
    rgbContractsQuery.isPending && !rgbContractsQuery.data;

  const table = (
    <div className="mt-4">
      <div className="flex justify-between h-7 items-center px-3">
        <div className="text-xs text-secondary-foreground">ASSET</div>
        <div className="text-right text-xs text-secondary-foreground">
          BALANCE
        </div>
      </div>
      <div className="space-y-1">
        {contracts.map((asset) => (
          <div
            key={asset.contract_id}
            className="cursor-pointer flex justify-between items-center py-3 px-3 hover:bg-background-3 rounded-2xl"
            role="button"
            // onClick={() => handleSelectAsset(asset.contract_id)}
            onClick={() =>
              nav("/dashboard/asset-detail?contract_id=" + asset.contract_id)
            }
          >
            <div className="h-10 flex gap-3">
              <AssetAvatar className="w-10 h-10" name={asset.name ?? ""} />
              <div>
                <div className="text-base font-medium">{asset.name}</div>
                <div className="text-sm text-secondary-foreground">
                  {asset.ticker}
                </div>
              </div>
            </div>
            <div className="h-10">
              <AssetBalance
                nodeId={activeNodeId ?? ""}
                contractId={asset.contract_id}
                precision={asset.precision ?? 0}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className="h-full bg-background-3 rounded-3xl py-5 px-2 border border-background-3 min-h-[405px]">
        <div className="flex justify-between h-[22px] items-center px-3">
          <span className="font-medium">RGB Assets</span>
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => setShowIssue(true)}
            >Issue Asset</Button>
          </div>
        </div>
        {isInitialLoading ? (
          <div className="text-base py-20 text-center">Loading...</div>
        ) : contracts.length > 0 ? (
          table
        ) : (
          <div className="py-[149px] text-center">
            <h4 className="text-base">No RGB Assets Found</h4>
            <div className="mt-1 text-xs text-secondary-foreground">
              Receive an asset or import to get started.
            </div>
          </div>
        )}
      </div>

      {/* issuers */}
      {showIssue ? (
        <IssueAsset
          onClose={() => setShowIssue(false)}
          activeNodeId={activeNodeId ?? ''}
          onSuccess={() => rgbContractsQuery.refetch()}
        />
      ) : null}

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
