import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useNodeStore } from "@/app/stores/nodeStore";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  contextsList,
  downloadTransferConsignmentFromLinkWithoutVerify,
  nodeMainHttp,
  nodeRgbContracts,
  nodeRgbOnchainPayments,
  nodeRgbOnchainSend,
} from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import { base64ToUint8Array, trimChar } from "@/lib/utils";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import Export1 from "./Export1";
import Export1Confirm from "./Export1Confirm";
import Export2 from "./Export2";
import ExportDone from "./ExportDone";

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

  // Check if already paid
  const checkPaidMutation = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) {
        throw new Error("No active node selected");
      }
      if (!invoiceTrim) {
        throw new Error("RGB Onchain Invoice is required");
      }

      // payment list
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

      const data = await downloadTransferConsignmentFromLinkWithoutVerify(
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
    <ContentWrapper>
      <ContentHeader
        title="Export RGB Asset"
        onBack={() => {
          if (step === 1 && stepOneMode === "confirm") {
            setStepOneMode("form");
            return;
          }
          navigate(-1);
        }}
      />

     <Content>
        {/* <CardHeader className="space-y-3">
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
        </CardHeader> */}

        <div>
          {/* Check & pay */}
          {step === 1 && (
            <div>
              {stepOneMode === "form" ? (
                <Export1
                  disabled={!invoiceTrim || checkPaidMutation.isPending}
                  invoice={invoice}
                  onChangeInvoice={(v) => {
                    setInvoice(v);
                    setStepOneMode("form");
                  }}
                  onNext={() => checkPaidMutation.mutate()}
                />
              ) : (
                <>
                  <Export1Confirm
                    invoice={invoice}
                    amount={decodedAmountDisplay ?? ''}
                    decodedContract={decodedContract}
                    disabled={
                      payMutation.isPending ||
                      onchainInvoiceDecodeQuery.isFetching ||
                      onchainInvoiceDecodeQuery.isError
                    }
                    onNext={() => payMutation.mutate()}
                  />

                  {onchainInvoiceDecodeQuery.isError ? (
                    <Alert variant="destructive" className="mt-3">
                      <AlertDescription>
                        {errorToText(onchainInvoiceDecodeQuery.error)}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </>
              )}
            </div>
          )}

          {/* Download file */}
          {step === 2 && (
            <Export2
              disabled={!consignmentLink || downloadMutation.isPending}
              onNext={() => downloadMutation.mutate()}
            />
          )}

          {step === 3 && (
            <ExportDone
              amount={decodedAmountDisplay ?? ''}
              assetName={decodedContract?.name ?? ''}
            />
          )}

          {(contextsQuery.isError || paymentsQuery.isError) && (
            <Alert variant="destructive">
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
        </div>
      </Content>
    </ContentWrapper>
  );
}
