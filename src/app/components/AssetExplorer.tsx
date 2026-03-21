import { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  base64ToUint8Array,
  cn,
  formatAddress,
  getGradientStyle,
} from "@/lib/utils";
import ImportOnchainAsset from "./ImportOnchainAssetDialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { nodeRgbContractExportBundle, nodeRgbContracts } from "@/lib/commands";
import AssetBalance from "./AssetBalance";
import { RgbContractDto } from "@/lib/sdk/types";
import IssueAsset from "./IssueAsset";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import ImportLocalContract from "./ImportContract";
import AcceptOnChainPaymentDialog from "./AcceptOnChainPaymentDialog";
import CopyText from "./CopyText";

export type Asset = RgbContractDto;

function AssetAvatar({ name }: { name: string }) {
  const first = (name.trim().charAt(0) || "?").toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white"
      style={{ background: getGradientStyle(name) }}
    >
      {first}
    </span>
  );
}

function AssetDetails({
  activeNodeId,
  asset,
  onBack,
}: {
  activeNodeId: string;
  asset: Asset;
  onBack: () => void;
}) {
  const exportContract = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) throw new Error("No active node selected");

      const data = await nodeRgbContractExportBundle(
        activeNodeId,
        asset.contract_id
      );

      // Svae file
      const path = await save({
        defaultPath: asset.contract_id + ".raw",
      });
      if (!path) {
        throw new Error("File save cancelled by user");
      }
      const bytes = base64ToUint8Array(data.archive_base64);
      await writeFile(path, bytes);
    },
    onSuccess: () => {
      toast.success("Contract exported successfully");
    },
  });

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-base">
              <AssetAvatar name={asset.name ?? ""} />
              <span>{asset.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border ui-border p-3">
              <div className="text-xs ui-muted">Contract ID</div>
              <div className="mt-1 break-all font-mono text-xs">
                {asset.contract_id}
              </div>
            </div>
            <div className="rounded-lg border ui-border p-3">
              <div className="text-xs ui-muted">Asset ID</div>
              <div className="mt-1 break-all font-mono text-xs">
                {asset.asset_id}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="ui-muted">Ticker</span>
              <span className="font-medium">{asset.ticker}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="ui-muted">Amount</span>
              <span className="font-medium">
                <AssetBalance
                  nodeId={activeNodeId}
                  contractId={asset.contract_id}
                  precision={asset.precision ?? 0}
                />
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="ui-muted">Precision</span>
              <span className="font-medium">{asset.precision}</span>
            </div>
            {/* <Button
              variant="secondary"
              size="sm"
              className="w-full mt-3"
              disabled={exportContract.isPending}
              onClick={() => exportContract.mutate()}
            >Export Contract</Button> */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AssetExplorer({
  title = "RGB Assets",
  withCard = true,
  // assets,
  selectedAssetId,
  onSelectAsset,
  onBackFromDetails,
  inlineDetails = true,
  tableHeight,
  activeNodeId = "",
}: {
  title?: string;
  withCard?: boolean;
  // assets?: Asset[];
  selectedAssetId?: string | null;
  onSelectAsset?: (assetId: string) => void;
  onBackFromDetails?: () => void;
  inlineDetails?: boolean;
  tableHeight?: number;
  activeNodeId: string;
}) {
  const rgbContractsQuery = useQuery({
    queryKey: ["dashboard_rgb_contracts", activeNodeId],
    queryFn: async () => {
      // await nodeUnlock(activeNodeId!);
      // await nodeRgbSync(activeNodeId!);
      return nodeRgbContracts(activeNodeId!);
    },
    enabled: !!activeNodeId,
    // refetchInterval: 10_000,
    refetchInterval: false,
  });

  const contracts = rgbContractsQuery.data?.contracts ?? [];

  const [showIssue, setShowIssue] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showImportLocalContract, setShowImportlocalContract] = useState(false);
  const [innerSelectedAssetId, setInnerSelectedAssetId] = useState<
    string | null
  >(null);
  const resolvedSelectedId =
    selectedAssetId !== undefined ? selectedAssetId : innerSelectedAssetId;
  const handleSelectAsset = onSelectAsset ?? setInnerSelectedAssetId;
  const handleBackFromDetails =
    onBackFromDetails ?? (() => setInnerSelectedAssetId(null));

  const selectedAsset = useMemo(
    () =>
      contracts.find((item) => item.contract_id === resolvedSelectedId) ?? null,
    [contracts, resolvedSelectedId]
  );

  if (inlineDetails && selectedAsset) {
    return (
      <AssetDetails
        activeNodeId={activeNodeId}
        asset={selectedAsset}
        onBack={handleBackFromDetails}
      />
    );
  }

  const table = (
    <ScrollArea
      className="w-full"
      style={tableHeight ? { height: `${tableHeight}px` } : undefined}
    >
      <Table style={{ width: "max-content" }}>
        <TableHeader>
          <TableRow>
            <TableHead>Asset Name</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Ticker</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rgbContractsQuery.isRefetching ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4">
                Loading...
              </TableCell>
            </TableRow>
          ) : (
            rgbContractsQuery.data?.contracts.map((asset) => (
              <TableRow
                key={asset.contract_id}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => handleSelectAsset(asset.contract_id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectAsset(asset.contract_id);
                  }
                }}
              >
                <TableCell>
                  <div className="flex items-start gap-3">
                    <AssetAvatar name={asset.name ?? ""} />
                    <div className="min-w-0">
                      <div className="font-medium">{asset.name}</div>
                      <div className="flex items-center gap-1 text-xs ui-muted">
                        <span className="font-mono">
                          {formatAddress(asset.contract_id)}
                        </span>
                        <CopyText text={asset.contract_id} />
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <AssetBalance
                    nodeId={activeNodeId}
                    contractId={asset.contract_id}
                    precision={asset.precision ?? 0}
                  />
                </TableCell>
                <TableCell>{asset.ticker}</TableCell>
                <TableCell>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  if (!withCard) return table;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between">
            <span>{title}</span>
            <div className="flex gap-3">
              <Button
                disabled={rgbContractsQuery.isPending}
                variant="outline"
                className="h-7 w-7"
                aria-label="Sync wallet"
                title="Sync wallet"
                onClick={() => {
                  rgbContractsQuery.refetch();
                }}
              >
                <RefreshCw className={cn("h-3.5 w-3.5")} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 w-full">{table}</div>
        </CardContent>
      </Card>

      {showImport ? (
        <ImportOnchainAsset
          activeNodeId={activeNodeId}
          onClose={() => setShowImport(false)}
          onSuccess={() => rgbContractsQuery.refetch()}
        />
      ) : null}

      {showIssue ? (
        <IssueAsset
          onClose={() => setShowIssue(false)}
          activeNodeId={activeNodeId}
          onSuccess={() => rgbContractsQuery.refetch()}
        />
      ) : null}

      {showImportLocalContract ? (
        <ImportLocalContract
          onClose={() => setShowImportlocalContract(false)}
          activeNodeId={activeNodeId}
          onSuccess={() => rgbContractsQuery.refetch()}
        />
      ) : null}

      {showAcceptDialog ? (
        <AcceptOnChainPaymentDialog
          activeNodeId={activeNodeId}
          onSuccess={() => rgbContractsQuery.refetch()}
          onClose={() => setShowAcceptDialog(false)}
        />
      ) : null}
    </>
  );
}
