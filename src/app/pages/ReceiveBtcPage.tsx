import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNodeStore } from "@/app/stores/nodeStore";
import {
  nodeBolt11Receive,
  nodeBolt12OfferReceiveVar,
  nodeRgbContracts,
  nodeRgbLnInvoiceCreate,
  nodeRgbOnchainInvoiceCreate,
  nodeRgbOnchainTransferConsignmentAccept,
  nodeRgbSync,
  // nodeUnlock,
  pluginWalletTransferConsignmentExport,
} from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import { u64 } from "@/lib/sdk";
import { ArrowLeft, ArrowRight, Check, Copy } from "lucide-react";
import RgbUtxoSelect from "../components/RgbUtxoSelect";
import { toast } from "sonner";

type ReceiveMode = "invoice" | "offer" | "rgb_invoice" | "rgb_onchain_invoice";
type ReceiveStep = "select" | "form" | "result";

function isDigits(s: string): boolean {
  return /^\d+$/.test(s.trim());
}

export function ReceiveBtcPage({ onBackRoot }: { onBackRoot: () => void }) {
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const [step, setStep] = useState<ReceiveStep>("select");
  const [mode, setMode] = useState<ReceiveMode | null>(null);
  const [amountMsat, setAmountMsat] = useState("1000000");
  const [description, setDescription] = useState("Receive BTC");
  const [createdValue, setCreatedValue] = useState("");
  const [createdAmountMsat, setCreatedAmountMsat] = useState("");
  const [copied, setCopied] = useState(false);
  const [rgbAssetId, setRgbAssetId] = useState("");
  const [rgbAssetAmount, setRgbAssetAmount] = useState("21");
  const [rgbCarrierAmountMsat, setRgbCarrierAmountMsat] = useState("5000000");
  const [currentRgbUtxo, setCurrentRgbUtxo] = useState("");
  const [currentContractId, setCurrentContractId] = useState("");

  const rgbContractsQuery = useQuery({
    queryKey: ["receive_rgb_contracts", activeNodeId],
    queryFn: async () => {
      // await nodeUnlock(activeNodeId!);
      await nodeRgbSync(activeNodeId!);
      return nodeRgbContracts(activeNodeId!);
    },
    enabled: !!activeNodeId && (mode === "rgb_invoice" || mode === "rgb_onchain_invoice"),
    refetchInterval: false,
  });

  const selectedRgbContract = useMemo(
    () =>
      (rgbContractsQuery.data?.contracts ?? []).find(
        (c) => c.asset_id === rgbAssetId
      ) ?? null,
    [rgbAssetId, rgbContractsQuery.data?.contracts]
  );

  useEffect(() => {
    if (mode !== "rgb_invoice") return;
    if (rgbAssetId.trim()) return;
    const first = rgbContractsQuery.data?.contracts?.[0];
    if (first?.asset_id) {
      setRgbAssetId(first.asset_id);
    }
  }, [mode, rgbAssetId, rgbContractsQuery.data?.contracts]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) throw new Error("No active node selected");
      const amount = amountMsat.trim();
      const desc = description.trim() || "Receive BTC";

      if (mode === 'rgb_onchain_invoice') {
        const asset = rgbContractsQuery.data?.contracts.find(c => c.contract_id === currentContractId);
        const precision = asset?.precision ?? 0;

        const resp = await nodeRgbOnchainInvoiceCreate(activeNodeId, {
          contract_id: currentContractId,
          amount: u64(Number(rgbAssetAmount.trim()) * 10 ** precision),
          use_witness_utxo: false,
          blinding_utxo: currentRgbUtxo.trim()
        });

        return { value: resp.invoice, amount: rgbAssetAmount.trim() };
      }

      if (mode === "rgb_invoice") {
        const asset = rgbContractsQuery.data?.contracts.find(c => c.asset_id === rgbAssetId);
        const precision = asset?.precision ?? 0;

        const resp = await nodeRgbLnInvoiceCreate(activeNodeId, {
          asset_id: rgbAssetId.trim(),
          asset_amount: u64(Number(rgbAssetAmount.trim()) * 10 ** precision),
          description: desc,
          expiry_secs: 3600,
          btc_carrier_amount_msat: u64(rgbCarrierAmountMsat.trim()),
        });
        return { value: resp.invoice, amount: rgbAssetAmount.trim() };
      }
      if (mode === "invoice") {
        const resp = await nodeBolt11Receive(activeNodeId, {
          amount_msat: u64(amount),
          description: desc,
          expiry_secs: 3600,
        });
        return { value: resp.invoice, amount };
      }
      const resp = await nodeBolt12OfferReceiveVar(activeNodeId, {
        description: desc,
        expiry_secs: 3600,
      });
      return { value: resp.offer, amount: "" };
    },
    onSuccess: (resp) => {
      setCreatedValue(resp.value);
      setCreatedAmountMsat(resp.amount);
      setStep("result");
    },
  });

  const validationError = useMemo(() => {
    if (!activeNodeId) return "No active node selected.";
    if (mode === "rgb_invoice") {
      if (rgbContractsQuery.isPending) return "Loading RGB assets...";
      if (!rgbAssetId.trim()) return "RGB asset is required.";
      if (!isDigits(rgbAssetAmount.trim()))
        return "RGB amount must be an integer.";
      if (rgbAssetAmount.trim() === "0")
        return "RGB amount must be greater than 0.";
      if (!isDigits(rgbCarrierAmountMsat.trim()))
        return "BTC carrier must be an integer (msat).";
      if (rgbCarrierAmountMsat.trim() === "0")
        return "BTC carrier must be greater than 0.";
      return null;
    }
    if (mode === "offer") return null;
    const amount = amountMsat.trim();
    if (!amount) return "Amount (msat) is required.";
    if (!isDigits(amount)) return "Amount must be an integer (msat).";
    if (amount === "0") return "Amount must be greater than 0.";
    return null;
  }, [
    activeNodeId,
    amountMsat,
    mode,
    rgbAssetAmount,
    rgbAssetId,
    rgbCarrierAmountMsat,
    rgbContractsQuery.isPending,
  ]);

  const title =
    step === "select"
      ? "Receive BTC / RGB"
      : step === "form"
      ? mode === "invoice"
        ? "Create Lightning invoice"
        : mode === "offer"
        ? "Lightning offer"
        : mode === "rgb_invoice"
        ? "Create RGB Lightning invoice"
        : mode === "rgb_onchain_invoice"
        ? "Create RGB OnChain invoice"
        : ""
      : "Receive BTC / RGB";

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          if (step === "select") {
            onBackRoot();
            return;
          }
          if (step === "form") {
            setStep("select");
            setMode(null);
            return;
          }
          setStep("form");
        }}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "select" ? (
            <div className="space-y-4">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="w-full justify-between px-2.5"
                onClick={() => {
                  setMode("invoice");
                  setStep("form");
                }}
              >
                Lightning Invoice
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-between px-2.5"
                size="lg"
                onClick={() => {
                  setMode("offer");
                  setStep("form");
                }}
              >
                Lightning Offer
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-between px-2.5"
                size="lg"
                onClick={() => {
                  setMode("rgb_invoice");
                  setDescription("Receive RGB");
                  setStep("form");
                }}
              >
                RGB Lightning Invoice
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-between px-2.5"
                size="lg"
                onClick={() => {
                  setMode("rgb_onchain_invoice");
                  setDescription("Receive RGB OnChain");
                  setStep("form");
                }}
              >
                RGB OnChain Invoice
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ) : null}

          {step === "form" ? (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {
                  mode === "rgb_onchain_invoice" ? (
                  <>
                    <Field>
                      <FieldLabel htmlFor="recv_rgb_contract_id">
                        RGB Asset
                      </FieldLabel>
                      <Select
                        value={currentContractId || undefined}
                        onValueChange={setCurrentContractId}
                      >
                        <SelectTrigger id="recv_rgb_contract_id" className="h-10">
                          <SelectValue placeholder="Pick RGB asset..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(rgbContractsQuery.data?.contracts ?? []).map(
                            (c) => (
                              <SelectItem
                                key={c.contract_id}
                                value={c.contract_id}
                              >
                                {c.name ??
                                  c.ticker ??
                                  c.contract_id.slice(0, 10)}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="recv_rgb_amount">Amount</FieldLabel>
                      <Input
                        id="recv_rgb_amount"
                        value={rgbAssetAmount}
                        onChange={(e) =>
                          setRgbAssetAmount(e.currentTarget.value)
                        }
                        inputMode="numeric"
                        placeholder="21"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="recv_rgb_carrier">
                        Blinding Utxo
                      </FieldLabel>
                      <RgbUtxoSelect
                        nodeId={activeNodeId ?? ''}
                        onChangeUtxo={setCurrentRgbUtxo}
                      />
                    </Field>
                  </>
                  ) : mode === "rgb_invoice" ? (
                  <>
                    <Field>
                      <FieldLabel htmlFor="recv_rgb_asset_id">
                        RGB Asset
                      </FieldLabel>
                      <Select
                        value={rgbAssetId || undefined}
                        onValueChange={setRgbAssetId}
                      >
                        <SelectTrigger id="recv_rgb_asset_id" className="h-10">
                          <SelectValue placeholder="Pick RGB asset..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(rgbContractsQuery.data?.contracts ?? []).map(
                            (c) => (
                              <SelectItem
                                key={c.contract_id}
                                value={c.asset_id}
                              >
                                {c.name ??
                                  c.ticker ??
                                  c.contract_id.slice(0, 10)}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="recv_rgb_amount">Amount</FieldLabel>
                      <Input
                        id="recv_rgb_amount"
                        value={rgbAssetAmount}
                        onChange={(e) =>
                          setRgbAssetAmount(e.currentTarget.value)
                        }
                        inputMode="numeric"
                        placeholder="21"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="recv_rgb_carrier">
                        BTC Carrier (msat)
                      </FieldLabel>
                      <Input
                        id="recv_rgb_carrier"
                        value={rgbCarrierAmountMsat}
                        onChange={(e) =>
                          setRgbCarrierAmountMsat(e.currentTarget.value)
                        }
                        inputMode="numeric"
                        placeholder="5000000"
                      />
                    </Field>
                  </>
                ) : mode === "invoice" ? (
                  <Field>
                    <FieldLabel htmlFor="recv_amount_msat">
                      Amount (msat)
                    </FieldLabel>
                    <Input
                      id="recv_amount_msat"
                      value={amountMsat}
                      onChange={(e) => setAmountMsat(e.currentTarget.value)}
                      inputMode="numeric"
                      placeholder="1000000"
                    />
                  </Field>
                ) : null}

                <Field>
                  <FieldLabel htmlFor="recv_desc">Description</FieldLabel>
                  <Input
                    id="recv_desc"
                    value={description}
                    onChange={(e) => setDescription(e.currentTarget.value)}
                    placeholder="Receive BTC"
                  />
                </Field>
              </div>

              {validationError ? (
                <Alert variant="destructive">
                  <AlertTitle>Invalid input</AlertTitle>
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              ) : null}
              {mode === "rgb_invoice" && rgbContractsQuery.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>RGB assets load failed</AlertTitle>
                  <AlertDescription>
                    {errorToText(rgbContractsQuery.error)}
                  </AlertDescription>
                </Alert>
              ) : null}

              {createMutation.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Create failed</AlertTitle>
                  <AlertDescription>
                    {errorToText(createMutation.error)}
                  </AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="button"
                className="w-full mt-4"
                disabled={!!validationError || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>

              {mode === "rgb_onchain_invoice" ? <CheckPayment activeNodeId={activeNodeId} /> : null}
            </>
          ) : null}

          {step === "result" && createdValue ? (
            <>
              <div className="flex justify-center rounded-md border p-4">
                <QRCodeSVG value={createdValue} size={180} includeMargin />
              </div>

              <div className="space-y-2">
                <div className="text-sm">
                  Amount:{" "}
                  {(mode === "rgb_invoice" || mode === "rgb_onchain_invoice")
                    ? `${createdAmountMsat} RGB`
                    : mode === "offer"
                    ? "Variable amount"
                    : `${createdAmountMsat} msat`}
                </div>
                {mode === "rgb_invoice" && selectedRgbContract ? (
                  <div className="text-sm">
                    Asset:{" "}
                    {selectedRgbContract.name ??
                      selectedRgbContract.ticker ??
                      "-"}
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <div className="text-sm">
                    {mode === "offer" ? "Offer:" : "Invoice:"}
                  </div>
                  <code className="block break-all rounded-md text-xs">
                    {createdValue}
                  </code>
                </div>
              </div>
              <div>
                {mode === "rgb_onchain_invoice" ? <CheckPayment activeNodeId={activeNodeId} /> : null}
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    await navigator.clipboard.writeText(createdValue);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1200);
                  }}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy Invoice"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    onBackRoot();
                  }}
                >
                  Back
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function CheckPayment(props: {activeNodeId: string | null}) {
  const [paymentId, setPaymentId] = useState("");

   const acceptPaymentMutation = useMutation({
    mutationFn: async () => {
      if(!props.activeNodeId) {
        throw new Error("No active node selected");
      }
      if(!paymentId) {
        throw new Error("Payment ID is required");
      }

      // Download consignment
      const data = await pluginWalletTransferConsignmentExport(paymentId);
      if(!data.archive_base64) {
        throw new Error((data as any).message || "Failed to download consignment");
      }

      // Accept payment
      return nodeRgbOnchainTransferConsignmentAccept(props.activeNodeId, data.archive_base64)
    },
    onSuccess: () => {
      toast.success(`Payment accepted`);
      setPaymentId("");
    },
    onError: (e) => {
      toast.error((e as Error).message);
    }
  })

  return (
    <>
      <Field className="mt-4">
        <FieldLabel>Payment ID</FieldLabel>
        <Input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} />
      </Field>
      <Button
        type="button"
        variant="secondary"
        className="w-full mt-4"
        disabled={!paymentId || acceptPaymentMutation.isPending}
        onClick={() => acceptPaymentMutation.mutate()}
      >
        {acceptPaymentMutation.isPending ? "Accepting..." : "Accept Onchain Payment After Paid"}
      </Button>
    </>
  )
}
