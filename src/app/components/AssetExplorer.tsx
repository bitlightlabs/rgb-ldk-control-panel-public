import { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
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
import { getGradientStyle } from "@/lib/utils";
import ImportAssetDialog from "./ImportAssetDialog";
import { useQuery } from "@tanstack/react-query";
import { nodeRgbContracts } from "@/lib/commands";
import AssetBalance from "./AssetBalance";
import { RgbContractDto } from "@/lib/sdk/types";
import IssueAsset from "./IssueAsset";

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

function AssetDetails({ activeNodeId, asset, onBack }: { activeNodeId: string, asset: Asset; onBack: () => void }) {
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
              <AssetAvatar name={asset.name ?? ''} />
              <span>{asset.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border ui-border p-3">
              <div className="text-xs ui-muted">Contract ID</div>
              <div className="mt-1 break-all font-mono text-xs">{asset.contract_id}</div>
            </div>
            {/* <div className="rounded-lg border ui-border p-3">
              <div className="text-xs ui-muted">Issuer</div>
              <div className="mt-1 break-all font-mono text-xs">
                {asset.issuer}
              </div>
            </div> */}
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
            {/* <div className="flex items-center justify-between">
              <span className="ui-muted">Confirmed</span>
              <span className="font-medium">{asset.confirmed}</span>
            </div> */}
            <div className="flex items-center justify-between">
              <span className="ui-muted">Precision</span>
              <span className="font-medium">{asset.precision}</span>
            </div>
            {/* <div className="flex items-center justify-between">
              <span className="ui-muted">Block</span>
              <span className="font-medium">{asset.block}</span>
            </div> */}
            {/* <div className="flex items-center justify-between">
              <span className="ui-muted">Circulating</span>
              <span className="font-medium">{asset.circulating}</span>
            </div>
            <div className="pt-1 text-xs ui-muted">Created At: {createdAt}</div> */}
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
  activeNodeId = '',
}: {
  title?: string;
  withCard?: boolean;
  // assets?: Asset[];
  selectedAssetId?: string | null;
  onSelectAsset?: (assetId: string) => void;
  onBackFromDetails?: () => void;
  inlineDetails?: boolean;
  activeNodeId: string
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
  const [innerSelectedAssetId, setInnerSelectedAssetId] = useState<
    string | null
  >(null);
  const resolvedSelectedId =
    selectedAssetId !== undefined ? selectedAssetId : innerSelectedAssetId;
  const handleSelectAsset = onSelectAsset ?? setInnerSelectedAssetId;
  const handleBackFromDetails =
    onBackFromDetails ?? (() => setInnerSelectedAssetId(null));

  const selectedAsset = useMemo(
    () => contracts.find((item) => item.contract_id === resolvedSelectedId) ?? null,
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
    <Table className="border">
      <TableHeader>
        <TableRow>
          <TableHead>Asset Name</TableHead>
          <TableHead>Asset ID</TableHead>
          <TableHead>Ticker</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead className="w-[40px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {
          rgbContractsQuery.isPending && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4">
                Loading...
              </TableCell>
            </TableRow>
          )
        }
        {rgbContractsQuery.data?.contracts.map((asset) => (
          <TableRow
            key={asset.contract_id}
            className="cursor-pointer"
            onClick={() => handleSelectAsset(asset.contract_id)}
          >
            <TableCell>
              <div className="flex items-center gap-3 w-[200px]">
                <AssetAvatar name={asset.name ?? ''} />
                <div>
                  <div className="truncate font-medium">{asset.name}</div>
                  <div className="truncate text-xs text-accent-foreground whitespace-pre-line break-all wrap-anywhere">
                    {asset.contract_id}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="w-[200px] whitespace-pre-line break-all wrap-anywhere">
                {asset.asset_id}
              </div>
            </TableCell>
            <TableCell>{asset.ticker}</TableCell>
            <TableCell>
              <AssetBalance
                nodeId={activeNodeId}
                contractId={asset.contract_id}
                precision={asset.precision ?? 0}
              />
            </TableCell>

            <TableCell className="text-right">
              <ChevronRight className="ml-auto h-4 w-4 ui-muted" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (!withCard) return table;

  return (
    <>
      <Card>
        <CardHeader >
          <CardTitle className="flex justify-between">
            <span>{title}</span>
            <div className="flex gap-3">
              <Button disabled={rgbContractsQuery.isPending} variant="secondary" onClick={() => rgbContractsQuery.refetch()}>Refresh</Button>
              <Button variant="secondary" onClick={() => setShowIssue(true)}>Issue Asset</Button>
              <Button variant="secondary" onClick={() => setShowImport(true)}>Import Onchain Asset</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>{table}</CardContent>
      </Card>

      {
        showImport ? (
          <ImportAssetDialog
            activeNodeId={activeNodeId}
            onClose={() => setShowImport(false)}
            onSuccess={() => rgbContractsQuery.refetch()}
          />) : null
      }

      {
        showIssue ? (
          <IssueAsset
            onClose={() => setShowIssue(false)}
            activeNodeId={activeNodeId}
            onSuccess={() => rgbContractsQuery.refetch()}
          />) : null
      }
    </>
  );
}
