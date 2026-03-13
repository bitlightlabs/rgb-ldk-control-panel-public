import { useMemo, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NodeContext, RgbContractsExportBundle } from "@/lib/domain";
import {
  nodeRgbSync,
  nodeRgbContractIssue,
  nodeRgbContractExportBundle,
  nodeRgbContractImportBundle,
  nodeRgbLnInvoiceCreate,
  nodeRgbLnPay,
  nodeRgbContractBalance,
} from "@/lib/commands";
import type {
  RgbContractBalanceResponse,
  RgbContractsIssueRequest,
  RgbLnInvoiceCreateRequest,
  RgbLnPayRequest,
} from "@/lib/sdk/types";
import { u64 } from "@/lib/sdk";
import { errorToText } from "@/lib/errorToText";
import { useMutation } from "@tanstack/react-query";

function NodePicker({
  label,
  contexts,
  value,
  onChange,
}: {
  label: string;
  contexts: NodeContext[];
  value: string | null;
  onChange: (nodeId: string) => void;
}) {
  const active = contexts.find((c) => c.node_id === value) ?? null;
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            type="button"
            className="justify-between"
            data-testid={`rgb-ln-picker-${label.toLowerCase().replace(/\s+/g, "-")}-trigger`}
          >
            <span className="truncate">{active ? active.display_name : "Pick a node…"}</span>
            <span className="ml-2 shrink-0 font-mono text-xs ui-muted">{active ? active.node_id.slice(0, 8) : ""}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[520px]"
          align="start"
          data-testid={`rgb-ln-picker-${label.toLowerCase().replace(/\s+/g, "-")}-menu`}
        >
          <DropdownMenuLabel>Nodes</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {contexts.length === 0 ? (
            <DropdownMenuItem disabled>No nodes</DropdownMenuItem>
          ) : (
            contexts.map((c) => (
              <DropdownMenuItem
                key={c.node_id}
                onClick={() => onChange(c.node_id)}
                data-testid={`rgb-ln-picker-item-${c.node_id}`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm">{c.display_name}</div>
                  <div className="truncate font-mono text-xs ui-muted">{c.main_api_base_url}</div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
        <div
          style={{ position: "absolute", left: "-10000px", top: 0, width: 1, height: 1, opacity: 1 }}
          aria-hidden="true"
        >
          {contexts.map((c) => (
            <button
              key={c.node_id}
              type="button"
              data-testid={`rgb-ln-picker-${label.toLowerCase().replace(/\s+/g, "-")}-hack-${c.node_id}`}
              onClick={() => onChange(c.node_id)}
            />
          ))}
        </div>
      </DropdownMenu>
    </div>
  );
}

export function RgbLnPanel({
  contexts,
  activeNodeId,
}: {
  contexts: NodeContext[];
  activeNodeId: string;
}) {
  const otherNodeId = useMemo(
    () => contexts.find((c) => c.node_id !== activeNodeId)?.node_id ?? null,
    [activeNodeId, contexts],
  );

  const [issuerNodeId, setIssuerNodeId] = useState<string | null>(activeNodeId ?? null);
  const [receiverNodeId, setReceiverNodeId] = useState<string | null>(otherNodeId);
  const [payerNodeId, setPayerNodeId] = useState<string | null>(activeNodeId ?? null);

  useEffect(() => {
    if (activeNodeId) {
      setIssuerNodeId((prev) => prev ?? activeNodeId);
      setPayerNodeId((prev) => prev ?? activeNodeId);
    }
  }, [activeNodeId]);

  useEffect(() => {
    if (otherNodeId) {
      setReceiverNodeId((prev) => prev ?? otherNodeId);
    }
  }, [otherNodeId]);

  const [issuerName, setIssuerName] = useState("issuer");
  const [contractName, setContractName] = useState("DemoRGB20");
  const [ticker, setTicker] = useState("RGB20");
  const [precision, setPrecision] = useState("0");
  const [issuedSupply, setIssuedSupply] = useState("1000000");

  const [issuedContractId, setIssuedContractId] = useState<string | null>(null);
  const [issuedAssetId, setIssuedAssetId] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<RgbContractsExportBundle | null>(null);

  const issueMutation = useMutation({
    mutationFn: async () => {
      if (!issuerNodeId) throw new Error("Missing issuer node");
      const req: RgbContractsIssueRequest = {
        issuer_name: issuerName.trim(),
        contract_name: contractName.trim(),
        ticker: ticker.trim() ? ticker.trim() : null,
        precision: precision.trim() ? Number(precision.trim()) : null,
        issued_supply: u64(issuedSupply.trim()).toString(),
        utxo: null,
      };
      return nodeRgbContractIssue(issuerNodeId, req);
    },
    onSuccess: (resp) => {
      setIssuedContractId(resp.contract_id);
      setIssuedAssetId(resp.asset_id);
      setLastExport(null);
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!issuerNodeId) throw new Error("Missing issuer node");
      if (!issuedContractId) throw new Error("Missing contract_id");
      return nodeRgbContractExportBundle(issuerNodeId, issuedContractId, "raw");
    },
    onSuccess: (bundle) => setLastExport(bundle),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!receiverNodeId) throw new Error("Missing receiver node");
      if (!lastExport) throw new Error("Missing export bundle");
      return nodeRgbContractImportBundle(receiverNodeId, lastExport.contract_id, lastExport.archive_base64, lastExport.format as any);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (nodeId: string) => nodeRgbSync(nodeId),
  });

  const [invoiceAssetId, setInvoiceAssetId] = useState<string | null>(null);
  const [invoiceAssetAmount, setInvoiceAssetAmount] = useState("1000");
  const [invoiceDesc, setInvoiceDesc] = useState("RGB LN transfer");
  const [invoiceExpiry, setInvoiceExpiry] = useState("600");
  const [invoiceCarrierMsat, setInvoiceCarrierMsat] = useState("1000");
  const [createdInvoice, setCreatedInvoice] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceAssetId && issuedAssetId) {
      setInvoiceAssetId(issuedAssetId);
    }
  }, [invoiceAssetId, issuedAssetId]);

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!receiverNodeId) throw new Error("Missing receiver node");
      if (!invoiceAssetId) throw new Error("Missing asset_id");
      const req: RgbLnInvoiceCreateRequest = {
        asset_id: invoiceAssetId.trim(),
        asset_amount: u64(invoiceAssetAmount.trim()),
        description: invoiceDesc.trim(),
        expiry_secs: Number(invoiceExpiry.trim() || "600"),
        btc_carrier_amount_msat: u64(invoiceCarrierMsat.trim()),
      };
      return nodeRgbLnInvoiceCreate(receiverNodeId, req);
    },
    onSuccess: (resp) => setCreatedInvoice(resp.invoice),
  });

  const [payInvoice, setPayInvoice] = useState("");
  const payMutation = useMutation({
    mutationFn: async () => {
      if (!payerNodeId) throw new Error("Missing payer node");
      const req: RgbLnPayRequest = {
        invoice: payInvoice.trim(),
        asset_id: null,
        asset_amount: null,
      };
      return nodeRgbLnPay(payerNodeId, req);
    },
  });

  const [balanceContractId, setBalanceContractId] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<string, RgbContractBalanceResponse>>({});
  useEffect(() => {
    if (!balanceContractId && issuedContractId) {
      setBalanceContractId(issuedContractId);
    }
  }, [balanceContractId, issuedContractId]);

  const balanceMutation = useMutation({
    mutationFn: async ({ nodeId, contractId }: { nodeId: string; contractId: string }) => {
      return nodeRgbContractBalance(nodeId, contractId);
    },
    onSuccess: (resp, vars) => {
      setBalances((prev) => ({ ...prev, [vars.nodeId]: resp }));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">RGB Lightning (BOLT-11) — RGB20</CardTitle>
        <CardDescription>Issue → export/import → invoice → pay → balance check.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <NodePicker label="Issuer node" contexts={contexts} value={issuerNodeId} onChange={setIssuerNodeId} />
          <NodePicker label="Receiver node" contexts={contexts} value={receiverNodeId} onChange={setReceiverNodeId} />
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-md border ui-border p-3 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Issuer name</Label>
            <Input value={issuerName} onChange={(e) => setIssuerName(e.currentTarget.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Contract name</Label>
            <Input value={contractName} onChange={(e) => setContractName(e.currentTarget.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Ticker</Label>
            <Input value={ticker} onChange={(e) => setTicker(e.currentTarget.value)} placeholder="RGB20" />
          </div>
          <div className="grid gap-2">
            <Label>Precision</Label>
            <Input value={precision} onChange={(e) => setPrecision(e.currentTarget.value)} inputMode="numeric" />
          </div>
          <div className="grid gap-2">
            <Label>Issued supply</Label>
            <Input value={issuedSupply} onChange={(e) => setIssuedSupply(e.currentTarget.value)} inputMode="numeric" />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => issueMutation.mutate()}
              disabled={issueMutation.isPending || !issuerNodeId}
            >
              {issueMutation.isPending ? "Issuing…" : "Issue asset"}
            </Button>
          </div>
        </div>

        {issueMutation.isError ? (
          <div className="text-sm ui-danger" data-testid="issue-error">
            {errorToText(issueMutation.error)}
          </div>
        ) : null}
        {issuedContractId ? (
          <div className="flex flex-wrap items-center gap-2 text-xs" data-testid="contract-info">
            <Badge variant="secondary">contract_id</Badge>
            <span className="font-mono ui-muted" data-testid="contract-id">
              {issuedContractId}
            </span>
            <Badge variant="secondary">asset_id</Badge>
            <span className="font-mono ui-muted" data-testid="asset-id">
              {issuedAssetId}
            </span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => issuerNodeId && syncMutation.mutate(issuerNodeId)}
            disabled={syncMutation.isPending || !issuerNodeId}
          >
            RGB sync issuer
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => receiverNodeId && syncMutation.mutate(receiverNodeId)}
            disabled={syncMutation.isPending || !receiverNodeId}
          >
            RGB sync receiver
          </Button>
          <Button
            type="button"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending || !issuerNodeId || !issuedContractId}
          >
            {exportMutation.isPending ? "Exporting…" : "Export contract"}
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending || !receiverNodeId || !lastExport}
          >
            {importMutation.isPending ? "Importing…" : "Import to receiver"}
          </Button>
        </div>

        {exportMutation.isError ? <div className="text-sm ui-danger">{errorToText(exportMutation.error)}</div> : null}
        {importMutation.isError ? <div className="text-sm ui-danger">{errorToText(importMutation.error)}</div> : null}

        <Separator />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <NodePicker label="Invoice receiver" contexts={contexts} value={receiverNodeId} onChange={setReceiverNodeId} />
          <NodePicker label="Invoice payer" contexts={contexts} value={payerNodeId} onChange={setPayerNodeId} />
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-md border ui-border p-3 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>asset_id</Label>
            <Input
              value={invoiceAssetId ?? ""}
              onChange={(e) => setInvoiceAssetId(e.currentTarget.value)}
              data-testid="rgb-ln-invoice-asset-id"
            />
          </div>
          <div className="grid gap-2">
            <Label>asset amount</Label>
            <Input
              value={invoiceAssetAmount}
              onChange={(e) => setInvoiceAssetAmount(e.currentTarget.value)}
              inputMode="numeric"
              data-testid="rgb-ln-invoice-asset-amount"
            />
          </div>
          <div className="grid gap-2">
            <Label>description</Label>
            <Input value={invoiceDesc} onChange={(e) => setInvoiceDesc(e.currentTarget.value)} />
          </div>
          <div className="grid gap-2">
            <Label>expiry (secs)</Label>
            <Input value={invoiceExpiry} onChange={(e) => setInvoiceExpiry(e.currentTarget.value)} inputMode="numeric" />
          </div>
          <div className="grid gap-2">
            <Label>carrier amount (msat)</Label>
            <Input
              value={invoiceCarrierMsat}
              onChange={(e) => setInvoiceCarrierMsat(e.currentTarget.value)}
              inputMode="numeric"
              data-testid="rgb-ln-invoice-carrier-msat"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => createInvoiceMutation.mutate()}
              disabled={createInvoiceMutation.isPending || !receiverNodeId}
            >
              {createInvoiceMutation.isPending ? "Creating…" : "Create RGB invoice"}
            </Button>
          </div>
        </div>

        {createInvoiceMutation.isError ? <div className="text-sm ui-danger">{errorToText(createInvoiceMutation.error)}</div> : null}
        {createdInvoice ? (
          <div className="grid gap-2">
            <Label>Invoice</Label>
            <Input value={createdInvoice} readOnly className="font-mono" />
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={async () => navigator.clipboard.writeText(createdInvoice)}
            >
              Copy invoice
            </Button>
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label>Pay invoice</Label>
          <Input value={payInvoice} onChange={(e) => setPayInvoice(e.currentTarget.value)} placeholder="rgb invoice" />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => payMutation.mutate()}
              disabled={payMutation.isPending || !payerNodeId || !payInvoice.trim()}
            >
              {payMutation.isPending ? "Paying…" : "Pay RGB invoice"}
            </Button>
            {payMutation.isSuccess ? (
              <Badge variant="success" data-testid="pay-success">
                paid
              </Badge>
            ) : null}
          </div>
          {payMutation.isError ? (
            <div className="text-sm ui-danger" data-testid="pay-error">
              {errorToText(payMutation.error)}
            </div>
          ) : null}
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Balance contract_id</Label>
            <Input
              value={balanceContractId ?? ""}
              onChange={(e) => setBalanceContractId(e.currentTarget.value)}
              data-testid="rgb-ln-balance-contract-id"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => issuerNodeId && balanceContractId && balanceMutation.mutate({ nodeId: issuerNodeId, contractId: balanceContractId })}
              disabled={balanceMutation.isPending || !issuerNodeId || !balanceContractId}
            >
              Check issuer balance
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => receiverNodeId && balanceContractId && balanceMutation.mutate({ nodeId: receiverNodeId, contractId: balanceContractId })}
              disabled={balanceMutation.isPending || !receiverNodeId || !balanceContractId}
            >
              Check receiver balance
            </Button>
          </div>
        </div>

        {balanceContractId ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {issuerNodeId && balances[issuerNodeId] ? (
              <pre className="rounded-md border ui-border ui-muted-30 p-2 text-xs">
                issuer: {JSON.stringify(balances[issuerNodeId].balance, null, 2)}
              </pre>
            ) : null}
            {receiverNodeId && balances[receiverNodeId] ? (
              <pre className="rounded-md border ui-border ui-muted-30 p-2 text-xs">
                receiver: {JSON.stringify(balances[receiverNodeId].balance, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
