import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useDownloadConsignmentWithoutVerifyMutation,
  useRgbOnchainPaymentLookupMutation,
  useRgbOnchainSendMutation,
} from "@/app/mutations";
import {
  useNodeRgbContractsQuery,
  useNodeRgbOnchainPaymentsQuery,
  useRgbOnchainInvoiceDecodeQuery,
} from "@/app/queries";
import { errorToText } from "@/lib/errorToText";
import { base64ToUint8Array, trimChar } from "@/lib/utils";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import Export1 from "./Export1";
import Export1Confirm from "./Export1Confirm";
import Export2 from "./Export2";
import ExportDone from "./ExportDone";
import { useContextStore } from "@/app/stores/contextStore";

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

export default function RgbExportPage() {
  const navigate = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id ?? '';

  const [step, setStep] = useState<ExportStep>(1);
  const [stepOneMode, setStepOneMode] = useState<StepOneMode>("form");
  const [invoice, setInvoice] = useState("");
  const [txid, setTxid] = useState("");
  const [consignmentLink, setConsignmentLink] = useState("");
  const [downloadFormat, setDownloadFormat] = useState<"raw" | "gzip" | "zip">(
    "raw"
  );
  const invoiceTrim = useMemo(() => invoice.trim(), [invoice]);

  const contractsQuery = useNodeRgbContractsQuery(activeNodeId, {
    refetchInterval: false,
  });

  const paymentsQuery = useNodeRgbOnchainPaymentsQuery(activeNodeId, "rgb_export", {
    enabled: !!activeNodeId && step === 2 && !!txid,
    refetchInterval: step === 2 ? 4_000 : false,
  });

  const onchainInvoiceDecodeQuery = useRgbOnchainInvoiceDecodeQuery(activeNodeId, invoiceTrim, {
    enabled:
      !!activeNodeId &&
      step === 1 &&
      stepOneMode === "confirm" &&
      invoiceTrim.length > 8,
    retry: 1,
    retryDelay: 200,
  });

  const decodedInvoice = useMemo((): RawRgbOnchainInvoiceDecodeResponse | null => {
    const resp = onchainInvoiceDecodeQuery.data;
    if (!resp) return null;
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
  }, [onchainInvoiceDecodeQuery.data]);

  const decodedContract = useMemo(() => {
    const contractId = decodedInvoice?.contract_id?.trim();
    if (!contractId) return null;
    return (
      (contractsQuery.data?.contracts ?? []).find(
        (item) => item.contract_id === contractId
      ) ?? null
    );
  }, [
    contractsQuery.data?.contracts,
    decodedInvoice?.contract_id,
  ]);

  const decodedAmount = useMemo(
    () => toU64Text(decodedInvoice?.amount),
    [decodedInvoice?.amount]
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

  const payMutation = useRgbOnchainSendMutation({
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
  const checkPaidMutation = useRgbOnchainPaymentLookupMutation({
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

  const downloadMutation = useDownloadConsignmentWithoutVerifyMutation({
    onSuccess: async (data) => {
      if (!data.archive_base64) {
        toast.error((data as any).message || "Failed to download consignment");
        return;
      }

      try {
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
          return;
        }

        await writeFile(path, base64ToUint8Array(data.archive_base64));
        toast.success("Consignment downloaded");
        setStep(3);
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    onError: (e) => {
      toast.error((e as Error).message);
    },
  });

  const downloadConsignment = () => {
      if (!consignmentLink) {
        toast.error("Consignment download link is required");
        return;
      }

      downloadMutation.mutate(buildFormattedLink(consignmentLink, downloadFormat));
  };

  const checkPaid = () => {
    if (!activeNodeId) {
      toast.error("No active node selected");
      return;
    }
    if (!invoiceTrim) {
      toast.error("RGB Onchain Invoice is required");
      return;
    }
    checkPaidMutation.mutate({ nodeId: activeNodeId, invoice: invoiceTrim });
  };

  const pay = () => {
    if (!activeNodeId) {
      toast.error("No active node selected");
      return;
    }
    if (!invoiceTrim) {
      toast.error("RGB Onchain Invoice is required");
      return;
    }
    payMutation.mutate({
      nodeId: activeNodeId,
      request: {
        invoice: invoiceTrim,
        fee_rate_sats_per_vb: 1,
      },
    });
  };

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
        {/* Check & pay */}
        {step === 1 ? (
          <div>
            {stepOneMode === "form" ? (
              <Export1
                disabled={!invoiceTrim || checkPaidMutation.isPending}
                invoice={invoice}
                onChangeInvoice={(v) => {
                  setInvoice(v);
                  setStepOneMode("form");
                }}
                onNext={checkPaid}
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
                  onNext={pay}
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
        ) : null}

        {/* Download file */}
        {step === 2 ? (
          <Export2
            disabled={!consignmentLink || downloadMutation.isPending}
            onNext={downloadConsignment}
          />
        ) : null}

        {step === 3 ? (
          <ExportDone
            amount={decodedAmountDisplay ?? ''}
            assetName={decodedContract?.name ?? ''}
          />
        ) : null}

        {(paymentsQuery.isError) ? (
          <Alert variant="destructive">
            <AlertDescription>
              {paymentsQuery.isError
                ? errorToText(paymentsQuery.error)
                : null}
            </AlertDescription>
          </Alert>
        ) : null}
      </Content>
    </ContentWrapper>
  );
}
