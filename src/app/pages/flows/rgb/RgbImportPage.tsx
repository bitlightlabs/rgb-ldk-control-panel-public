import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, CircleCheckBig, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useNodeStore } from "@/app/stores/nodeStore";
import { useNetworkStore } from "@/app/stores/networkStore";
import { getNetworkOption } from "@/app/config/networkOptions";
import RgbUtxoSelect from "@/app/components/RgbUtxoSelect";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  downloadTransferConsignmentFromLink,
  nodeRgbContractImportBundle,
  nodeRgbContracts,
  nodeRgbOnchainInvoiceCreate,
  nodeRgbOnchainTransferConsignmentAccept,
  nodeRgbSync,
  pluginWalletAssetExport,
} from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import { u64 } from "@/lib/sdk";

type ImportStep = 1 | 2 | 3 | 4;

function isDigits(s: string): boolean {
  return /^\d+$/.test(s.trim());
}

export function RgbImportPage() {
  const navigate = useNavigate();
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const network = useNetworkStore((s) => s.network);

  const [step, setStep] = useState<ImportStep>(1);
  const [stepOneTab, setStepOneTab] = useState<"select" | "import">("select");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [contractIdInput, setContractIdInput] = useState("");
  const [amount, setAmount] = useState("");
  const [utxo, setUtxo] = useState("");
  const [createdInvoice, setCreatedInvoice] = useState("");
  const [consignmentLink, setConsignmentLink] = useState("");
  const [copiedInvoice, setCopiedInvoice] = useState(false);

  const contractsQuery = useQuery({
    queryKey: ["rgb_import_contracts", activeNodeId],
    queryFn: async () => {
      await nodeRgbSync(activeNodeId!);
      return nodeRgbContracts(activeNodeId!);
    },
    enabled: !!activeNodeId,
    refetchInterval: false,
  });

  const selectedContract = useMemo(() => {
    const assetId = selectedAssetId.trim();
    if (!assetId) return null;
    return (
      (contractsQuery.data?.contracts ?? []).find(
        (c) => c.asset_id === assetId
      ) ?? null
    );
  }, [contractsQuery.data?.contracts, selectedAssetId]);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) {
        throw new Error("No active node selected");
      }
      const contractId = contractIdInput.trim();
      if (!contractId) {
        throw new Error("Contract ID is required");
      }

      const config = getNetworkOption(network);
      if (!config.coreUrl) {
        throw new Error("Core URL not configured for this network");
      }

      const contract = await pluginWalletAssetExport(
        contractId,
        config.coreUrl
      );
      if (!contract.archive_base64) {
        throw new Error(
          (contract as any).message || "Failed to download contract"
        );
      }

      await nodeRgbContractImportBundle(
        activeNodeId,
        contractId,
        contract.archive_base64
      );
      return contractId;
    },
    onSuccess: async (contractId) => {
      toast.success("RGB contract imported");
      const refetchResult = await contractsQuery.refetch();
      const importedContract = (refetchResult.data?.contracts ?? []).find(
        (item) => item.contract_id === contractId
      );

      if (!importedContract?.asset_id) {
        toast.error("Contract imported, but asset not found in local list yet");
        return;
      }

      setSelectedAssetId(importedContract.asset_id);
      setCreatedInvoice("");
      setConsignmentLink("");
      setAmount("");
      setStep(2);
    },
    onError: (e) => {
      toast.error((e as Error).message);
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) {
        throw new Error("No active node selected");
      }
      if (!selectedContract?.contract_id) {
        throw new Error("Contract not found. Please import asset first.");
      }
      if (!utxo.trim()) {
        throw new Error("Blinding UTXO is required");
      }
      if (!isDigits(amount) || amount.trim() === "0") {
        throw new Error("Amount must be an integer greater than 0");
      }

      const precision = selectedContract.precision ?? 0;
      const resp = await nodeRgbOnchainInvoiceCreate(activeNodeId, {
        contract_id: selectedContract.contract_id,
        amount: u64(Number(amount.trim()) * 10 ** precision),
        use_witness_utxo: false,
        blinding_utxo: utxo.trim(),
      });

      return resp.invoice;
    },
    onSuccess: (invoice) => {
      setCreatedInvoice(invoice);
      toast.success("RGB OnChain invoice created");
    },
    onError: (e) => {
      toast.error((e as Error).message);
    },
  });

  const acceptPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) {
        throw new Error("No active node selected");
      }
      if (!createdInvoice.trim()) {
        throw new Error("Invoice is required");
      }
      if (!consignmentLink.trim() || !consignmentLink.startsWith("http")) {
        throw new Error("Consignment link is invalid");
      }

      const data = await downloadTransferConsignmentFromLink(consignmentLink);
      if (!data.archive_base64) {
        throw new Error(
          (data as any).message || "Failed to download consignment"
        );
      }

      return nodeRgbOnchainTransferConsignmentAccept(
        activeNodeId,
        createdInvoice,
        data.archive_base64
      );
    },
    onSuccess: () => {
      toast.success("Payment accepted");
      setConsignmentLink("");
      setStep(4);
    },
    onError: (e) => {
      toast.error((e as Error).message);
    },
  });

  const stepItems = [
    { id: 1, label: "Select or Import Contract" },
    { id: 2, label: "Create Invoice" },
    { id: 3, label: "Paste Consignment Link" },
  ] as const;

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => navigate("/rgb/actions")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle>Import RGB Asset</CardTitle>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {stepItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-md border px-3 py-2 text-sm ${
                  item.id === step
                    ? "border-primary bg-primary/10 font-medium"
                    : item.id < step
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "ui-border"
                }`}
              >
                Step {item.id}: {item.label}
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <Tabs
                value={stepOneTab}
                onValueChange={(v) => setStepOneTab(v as "select" | "import")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="select">Select Asset</TabsTrigger>
                  <TabsTrigger value="import">Import Contract</TabsTrigger>
                </TabsList>

                <TabsContent value="select" className="space-y-4 pt-4">
                  <Select
                    value={selectedAssetId || "none"}
                    onValueChange={(v) =>
                      setSelectedAssetId(v === "none" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose asset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select RGB Asset</SelectItem>
                      {(contractsQuery.data?.contracts ?? []).map((item) => (
                        <SelectItem key={item.asset_id} value={item.asset_id}>
                          {item.ticker || item.name || "RGB"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    className="w-full h-12"
                    disabled={!selectedAssetId.trim()}
                    onClick={() => {
                      setCreatedInvoice("");
                      setConsignmentLink("");
                      setAmount("");
                      setStep(2);
                    }}
                  >
                    Next
                  </Button>
                </TabsContent>

                <TabsContent value="import" className="space-y-4 pt-4">
                  <Alert variant="default">
                    <AlertTitle>Tips</AlertTitle>
                    <AlertDescription>
                      New RGB assets must complete at least one L1 on-chain
                      transaction before import.
                    </AlertDescription>
                  </Alert>
                  <Field>
                    <FieldLabel>Contract ID</FieldLabel>
                    <Input
                      placeholder="Contract ID"
                      value={contractIdInput}
                      onChange={(e) => setContractIdInput(e.target.value)}
                    />
                  </Field>

                  <Button
                    type="button"
                    className="w-full h-12"
                    disabled={
                      importMutation.isPending || !contractIdInput.trim()
                    }
                    onClick={() => importMutation.mutate()}
                  >
                    {importMutation.isPending
                      ? "Importing Contract..."
                      : "Import Contract"}
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {!createdInvoice ? (
                <>
                  <Field>
                    <FieldLabel>Asset Name</FieldLabel>
                    <Input
                      value={
                        selectedContract?.name?.trim() ||
                        selectedContract?.ticker?.trim() ||
                        selectedContract?.asset_id ||
                        selectedAssetId
                      }
                      readOnly
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Contract ID</FieldLabel>
                    <Input
                      value={selectedContract?.contract_id ?? ""}
                      readOnly
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Amount</FieldLabel>
                    <Input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Amount"
                    />
                  </Field>

                  <Field>
                    <Label>Blinding UTXO</Label>
                    <RgbUtxoSelect
                      nodeId={activeNodeId ?? ""}
                      onChangeUtxo={setUtxo}
                    />
                  </Field>

                  <Button
                    type="button"
                    className="w-full h-12"
                    disabled={
                      createInvoiceMutation.isPending ||
                      !amount.trim() ||
                      !utxo.trim()
                    }
                    onClick={() => createInvoiceMutation.mutate()}
                  >
                    {createInvoiceMutation.isPending
                      ? "Creating RGB OnChain invoice..."
                      : "Create RGB OnChain invoice"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2 rounded-lg border p-3">
                    <div className="text-sm font-medium">Invoice</div>

                    <div className="rounded-md bg-muted p-2 text-xs break-all">
                      {createdInvoice}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        await navigator.clipboard.writeText(createdInvoice);
                        setCopiedInvoice(true);
                        window.setTimeout(() => setCopiedInvoice(false), 1200);
                      }}
                    >
                      {copiedInvoice ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy Invoice
                        </>
                      )}
                    </Button>
                  </div>

                  <Button
                    type="button"
                    className="w-full h-12"
                    onClick={() => {
                      setStep(3);
                      setConsignmentLink("");
                    }}
                  >
                    L1 wallet transaction completed
                  </Button>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Alert>
                <AlertTitle>Final Step</AlertTitle>
                <AlertDescription>
                  Copy the Consignment link from your L1 wallet, then paste it
                  here and continue.
                </AlertDescription>
              </Alert>

              <Field>
                <FieldLabel>Invoice</FieldLabel>
                <Input
                  value={createdInvoice}
                  onChange={(e) => setCreatedInvoice(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel>Consignment Link</FieldLabel>
                <Input
                  value={consignmentLink}
                  placeholder="Paste Consignment link from L1 wallet"
                  onChange={(e) => setConsignmentLink(e.target.value)}
                />
              </Field>

              <Button
                type="button"
                className="w-full h-12"
                disabled={!consignmentLink || acceptPaymentMutation.isPending}
                onClick={() => acceptPaymentMutation.mutate()}
              >
                {acceptPaymentMutation.isPending
                  ? "Accepting..."
                  : "Accept Payment"}
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="rounded-md border p-4 space-y-2">
              <div className="flex justify-center pb-5">
                <CircleCheckBig className="h-20 w-20 text-green-600" />
              </div>
              <div className="text-sm text-center">
                RGB import flow is completed. The payment has been accepted.
              </div>
            </div>
          )}

          {contractsQuery.isError && (
            <Alert variant="destructive">
              <AlertTitle>Request failed</AlertTitle>
              <AlertDescription>
                {contractsQuery.isError
                  ? errorToText(contractsQuery.error)
                  : null}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
