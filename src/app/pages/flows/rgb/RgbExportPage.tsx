import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CircleCheckBig, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useNodeStore } from "@/app/stores/nodeStore";
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
import { Textarea } from "@/components/ui/textarea";
import {
  contextsList,
  downloadTransferConsignmentFromLink,
  nodeMainHttp,
  nodeRgbContracts,
  nodeRgbOnchainPayments,
  nodeRgbOnchainSend,
} from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import { base64ToUint8Array, trimChar } from "@/lib/utils";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

type ExportStep = 1 | 2 | 3;
type StepOneMode = "form" | "confirm";

type RawRgbOnchainInvoiceDecodeResponse = {
  contract_id?: string;
  amount?: string | number | null;
  beneficiary?: string;
  use_witness_utxo?: boolean;
  expiry_unix_secs?: string | number | null;
};

function buildLink(baseUrl: string, path: string): string {
  return `${trimChar(baseUrl, "/")}${path}`;
}

function buildFormattedLink(
  link: string,
  format: "raw" | "gzip" | "zip"
): string {
  if (!link) return "";
  const url = new URL(link);
  url.searchParams.set("format", format);
  return url.toString();
}

function toU64Text(value: string | number | null | undefined): string | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return String(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return /^\d+$/.test(trimmed) ? trimmed : null;
  }
  return null;
}

function formatRgbAtomicAmount(amount: string, precision: number): string {
  const trimmed = amount.trim();
  if (!/^\d+$/.test(trimmed)) return amount;
  if (!Number.isSafeInteger(precision) || precision <= 0) return trimmed;

  const scale = 10n ** BigInt(precision);
  const n = BigInt(trimmed);
  const integer = n / scale;
  const fractionRaw = (n % scale).toString().padStart(precision, "0");
  const fraction = fractionRaw.replace(/0+$/, "");
  return fraction ? `${integer}.${fraction}` : integer.toString();
}

export function RgbExportPage() {
  const navigate = useNavigate();
  const activeNodeId = useNodeStore((s) => s.activeNodeId);

  const [step, setStep] = useState<ExportStep>(1);
  const [stepOneMode, setStepOneMode] = useState<StepOneMode>("form");
  const [invoice, setInvoice] = useState("");
  const [txid, setTxid] = useState("");
  const [consignmentLink, setConsignmentLink] = useState("");
  const [downloadFormat, setDownloadFormat] = useState<"raw" | "gzip" | "zip">(
    "raw"
  );
  const invoiceTrim = useMemo(() => invoice.trim(), [invoice]);

  const contextsQuery = useQuery({
    queryKey: ["contexts", "rgb_export"],
    queryFn: contextsList,
    enabled: !!activeNodeId,
    refetchInterval: false,
  });

  const contractsQuery = useQuery({
    queryKey: ["rgb_export_contracts", activeNodeId],
    queryFn: async () => nodeRgbContracts(activeNodeId!),
    enabled: !!activeNodeId,
    refetchInterval: false,
  });

  const paymentsQuery = useQuery({
    queryKey: ["rgb_onchain_payments", activeNodeId, "rgb_export", txid],
    queryFn: () => nodeRgbOnchainPayments(activeNodeId!),
    enabled: !!activeNodeId && step === 2 && !!txid,
    refetchInterval: step === 2 ? 4_000 : false,
  });

  const onchainInvoiceDecodeQuery = useQuery({
    queryKey: ["rgb_export_onchain_invoice_decode", activeNodeId, invoiceTrim],
    queryFn: async (): Promise<RawRgbOnchainInvoiceDecodeResponse | null> => {
      const resp = await nodeMainHttp(activeNodeId!, {
        method: "POST",
        path: "/rgb/onchain/invoice/decode",
        headers: { "content-type": "application/json" },
        bodyText: JSON.stringify({ invoice: invoiceTrim }),
      });
      if (!resp.ok) {
        throw new Error(
          `onchain decode failed: status=${resp.status} body=${resp.body.slice(
            0,
            200
          )}`
        );
      }
      try {
        return JSON.parse(resp.body) as RawRgbOnchainInvoiceDecodeResponse;
      } catch {
        throw new Error("onchain decode returned invalid JSON");
      }
    },
    enabled:
      !!activeNodeId &&
      step === 1 &&
      stepOneMode === "confirm" &&
      invoiceTrim.length > 8,
    retry: 1,
    retryDelay: 200,
  });

  const currentContext = useMemo(
    () =>
      (contextsQuery.data ?? []).find((c) => c.node_id === activeNodeId) ??
      null,
    [activeNodeId, contextsQuery.data]
  );

  const decodedContract = useMemo(() => {
    const contractId = onchainInvoiceDecodeQuery.data?.contract_id?.trim();
    if (!contractId) return null;
    return (
      (contractsQuery.data?.contracts ?? []).find(
        (item) => item.contract_id === contractId
      ) ?? null
    );
  }, [
    contractsQuery.data?.contracts,
    onchainInvoiceDecodeQuery.data?.contract_id,
  ]);

  const decodedAmount = useMemo(
    () => toU64Text(onchainInvoiceDecodeQuery.data?.amount),
    [onchainInvoiceDecodeQuery.data?.amount]
  );

  const decodedAmountDisplay = useMemo(() => {
    if (!decodedAmount) return null;
    return formatRgbAtomicAmount(
      decodedAmount,
      decodedContract?.precision ?? 0
    );
  }, [decodedAmount, decodedContract?.precision]);

  useEffect(() => {
    if (step !== 2 || !txid || !currentContext) return;

    const matchedPayment = (paymentsQuery.data?.payments ?? []).find(
      (item) => item.txid === txid && !!item.consignment_download_path
    );

    if (matchedPayment?.consignment_download_path) {
      setConsignmentLink(
        buildLink(
          currentContext.main_api_base_url,
          matchedPayment.consignment_download_path
        )
      );
    }
  }, [currentContext, paymentsQuery.data?.payments, step, txid]);

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) {
        throw new Error("No active node selected");
      }
      if (!invoiceTrim) {
        throw new Error("RGB Onchain Invoice is required");
      }
      return nodeRgbOnchainSend(activeNodeId, {
        invoice: invoiceTrim,
        fee_rate_sats_per_vb: 1,
      });
    },
    onSuccess: (resp) => {
      toast.success("Paid successfully");
      setTxid(resp.txid);
      setConsignmentLink("");
      setStepOneMode("form");
      setStep(2);
    },
    onError: (e) => {
      toast.error((e as Error).message);
    },
  });

  const checkPaidMutation = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) {
        throw new Error("No active node selected");
      }
      if (!invoiceTrim) {
        throw new Error("RGB Onchain Invoice is required");
      }

      const data = await nodeRgbOnchainPayments(activeNodeId);
      return (
        data.payments.find((item) => item.invoice?.trim() === invoiceTrim) ??
        null
      );
    },
    onSuccess: (matchedPayment) => {
      if (matchedPayment) {
        toast.success("Payment already found");
        setTxid(matchedPayment.txid ?? "");
        if (matchedPayment.consignment_download_path && currentContext) {
          setConsignmentLink(
            buildLink(
              currentContext.main_api_base_url,
              matchedPayment.consignment_download_path
            )
          );
        } else {
          setConsignmentLink("");
        }
        setStep(2);
        return;
      }

      setStepOneMode("confirm");
    },
    onError: (e) => {
      toast.error((e as Error).message);
    },
  });

  const stepItems = [
    { id: 1, label: "Pay RGB OnChain Invoice" },
    { id: 2, label: "Consignment Download" },
  ] as const;

  const downloadMutation = useMutation({
    mutationFn: async () => {
      if (!consignmentLink) {
        throw new Error("Consignment download link is required");
      }

      const data = await downloadTransferConsignmentFromLink(
        buildFormattedLink(consignmentLink, downloadFormat)
      );
      if (!data.archive_base64) {
        throw new Error(
          (data as any).message || "Failed to download consignment"
        );
      }

      const path = await save({
        defaultPath: `${txid || "consignment"}.${
          downloadFormat === "raw"
            ? "raw"
            : downloadFormat === "gzip"
            ? "gz"
            : "zip"
        }`,
      });
      if (!path) {
        throw new Error("File save cancelled by user");
      }

      await writeFile(path, base64ToUint8Array(data.archive_base64));
    },
    onSuccess: () => {
      toast.success("Consignment downloaded");
      setStep(3);
    },
    onError: (e) => {
      toast.error((e as Error).message);
    },
  });

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => {
          if (step === 1 && stepOneMode === "confirm") {
            setStepOneMode("form");
            return;
          }
          navigate("/rgb/actions");
        }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Export RGB Asset</CardTitle>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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
              {stepOneMode === "form" ? (
                <>
                  <Field>
                    <FieldLabel>RGB OnChain Invoice</FieldLabel>
                    <Textarea
                      value={invoice}
                      placeholder="Paste RGB Onchain Invoice"
                      onChange={(e) => {
                        setInvoice(e.target.value);
                        setStepOneMode("form");
                      }}
                      className="min-h-[120px] resize-y"
                    />
                  </Field>

                  <Button
                    type="button"
                    className="w-full h-12"
                    disabled={!invoiceTrim || checkPaidMutation.isPending}
                    onClick={() => checkPaidMutation.mutate()}
                  >
                    {checkPaidMutation.isPending ? "Checking..." : "Pay"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="rounded-md border p-4 space-y-2 text-sm">
                    <div>
                      Type:{" "}
                      <span className="font-medium">RGB OnChain invoice</span>
                    </div>
                    <div>
                      Asset:{" "}
                      <span className="font-medium">
                        {decodedContract?.name?.trim() ||
                          decodedContract?.ticker?.trim() ||
                          decodedContract?.contract_id ||
                          onchainInvoiceDecodeQuery.data?.contract_id ||
                          "-"}
                      </span>
                    </div>
                    <div>
                      Amount:{" "}
                      <span className="font-medium">
                        {onchainInvoiceDecodeQuery.isFetching
                          ? "Decoding..."
                          : decodedAmountDisplay
                          ? `${decodedAmountDisplay} ${
                              decodedContract?.ticker?.trim() || "RGB"
                            }`
                          : "-"}
                      </span>
                    </div>
                    <div>
                      Contract ID:{" "}
                      <span className="font-medium break-all">
                        {onchainInvoiceDecodeQuery.data?.contract_id || "-"}
                      </span>
                    </div>
                    <div>
                      Payment Request:
                      <code className="mt-1 block break-all rounded-md text-xs">
                        {invoiceTrim}
                      </code>
                    </div>
                  </div>

                  {onchainInvoiceDecodeQuery.isError ? (
                    <Alert variant="destructive">
                      <AlertTitle>Decode failed</AlertTitle>
                      <AlertDescription>
                        {errorToText(onchainInvoiceDecodeQuery.error)}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <Button
                    type="button"
                    className="w-full h-12"
                    disabled={
                      payMutation.isPending ||
                      onchainInvoiceDecodeQuery.isFetching ||
                      onchainInvoiceDecodeQuery.isError
                    }
                    onClick={() => payMutation.mutate()}
                  >
                    {payMutation.isPending ? "Paying..." : "Confirm Pay"}
                  </Button>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Field>
                <FieldLabel>Consignment Download Link</FieldLabel>
                <Input
                  value={consignmentLink}
                  placeholder="Waiting for transaction completion..."
                  readOnly
                />
              </Field>

              <Field>
                <FieldLabel>Download Format</FieldLabel>
                <Select
                  value={downloadFormat}
                  onValueChange={(value) =>
                    setDownloadFormat(value as "raw" | "gzip" | "zip")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raw">raw</SelectItem>
                    <SelectItem value="gzip">gzip</SelectItem>
                    <SelectItem value="zip">zip</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Button
                type="button"
                className="w-full h-12"
                disabled={!consignmentLink || downloadMutation.isPending}
                onClick={() => downloadMutation.mutate()}
              >
                <Download className="h-4 w-4" />
                {downloadMutation.isPending
                  ? "Downloading..."
                  : "Click Download"}
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-md border p-4 space-y-2">
              <div className="flex justify-center pb-5">
                <CircleCheckBig className="h-20 w-20 text-green-600" />
              </div>
              <div className="text-sm text-center">
                RGB export flow is completed. The consignment download link is
                ready.
              </div>
            </div>
          )}

          {(contextsQuery.isError || paymentsQuery.isError) && (
            <Alert variant="destructive">
              <AlertTitle>Request failed</AlertTitle>
              <AlertDescription>
                {contextsQuery.isError
                  ? errorToText(contextsQuery.error)
                  : null}
                {contextsQuery.isError && paymentsQuery.isError ? <br /> : null}
                {paymentsQuery.isError
                  ? errorToText(paymentsQuery.error)
                  : null}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
