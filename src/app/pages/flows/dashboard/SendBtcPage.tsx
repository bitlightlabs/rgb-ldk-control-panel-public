import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNodeStore } from "@/app/stores/nodeStore";
import {
  contextsList,
  nodeBolt11Decode,
  nodeBolt11Send,
  nodeBolt12OfferDecode,
  nodeBolt12OfferSend,
  nodeMainHttp,
  nodeRgbContracts,
  nodeRgbOnchainSend,
  nodeRgbLnPay,
} from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import { u64 } from "@/lib/sdk";
import { ArrowLeft, Check, CircleCheckBig, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";

type PayloadKind = "invoice" | "offer" | "onchain_asset" | "unknown";
type SendStep = "form" | "confirm" | "result";
type RawBolt11DecodeResponse = {
  amount_msat?: string | null;
  description?: string | null;
  description_hash?: string | null;
};
type RawRgbLnInvoiceDecodeResponse = {
  payment_hash?: string;
  destination?: string;
  carrier_amount_msat?: string | null;
  expiry_secs?: string | number;
  asset_id?: string | null;
  asset_amount?: string | null;
};
type RawRgbOnchainInvoiceDecodeResponse = {
  contract_id?: string;
  amount?: string | number | null;
  beneficiary?: string;
  use_witness_utxo?: boolean;
  expiry_unix_secs?: string | number | null;
};

function hasRgbInvoiceFields(
  data: RawRgbLnInvoiceDecodeResponse | null | undefined
): boolean {
  if (!data) return false;
  const assetId = typeof data.asset_id === "string" ? data.asset_id.trim() : "";
  const assetAmount =
    typeof data.asset_amount === "string" ? data.asset_amount.trim() : "";
  return assetId.length > 0 || assetAmount.length > 0;
}

function detectPayloadKind(value: string): PayloadKind {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "unknown";
  if (normalized.startsWith("contract:")) return "onchain_asset";
  if (normalized.startsWith("lno")) return "offer";
  if (normalized.startsWith("ln")) return "invoice";
  return "unknown";
}

function normalizeLightningPayload(value: string): string {
  return value
    .trim()
    .replace(/^lightning:/i, "")
    .replace(/[\s\u200B-\u200D\uFEFF]+/g, "");
}

function isDigits(value: string): boolean {
  return /^[0-9]+$/.test(value.trim());
}

function toU64Text(value: string | number | null | undefined): string | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return String(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return /^[0-9]+$/.test(trimmed) ? trimmed : null;
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

export function SendBtcPage({ onBackRoot }: { onBackRoot?: () => void }) {
  const navigate = useNavigate();
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const [step, setStep] = useState<SendStep>("form");
  const [payload, setPayload] = useState("");
  const [decodePayload, setDecodePayload] = useState("");
  const [description, setDescription] = useState("Pay BTC");
  const [offerAmountMsat, setOfferAmountMsat] = useState("");
  const [onchainFeeRate, setOnchainFeeRate] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [sentAmountText, setSentAmountText] = useState("");
  const [sentTypeText, setSentTypeText] = useState("");
  const [sentExtraText, setSentExtraText] = useState("");
  const [copied, setCopied] = useState(false);

  const goBackRoot = () => {
    if (onBackRoot) {
      onBackRoot();
      return;
    }
    navigate("/dashboard");
  };

  const payloadTrim = useMemo(
    () => normalizeLightningPayload(payload),
    [payload]
  );
  const detectedKind = useMemo(
    () => detectPayloadKind(payloadTrim),
    [payloadTrim]
  );
  const contextsQuery = useQuery({
    queryKey: ["contexts"],
    queryFn: contextsList,
  });
  const activeContext = useMemo(() => {
    if (!activeNodeId) return null;
    return (
      (contextsQuery.data ?? []).find((c) => c.node_id === activeNodeId) ?? null
    );
  }, [activeNodeId, contextsQuery.data]);
  const activeContextLabel = useMemo(() => {
    if (!activeNodeId) return "";
    const baseUrl = activeContext?.main_api_base_url ?? "(unknown base_url)";
    return `node_id=${activeNodeId}, base_url=${baseUrl}`;
  }, [activeContext?.main_api_base_url, activeNodeId]);

  useEffect(() => {
    if (step !== "form") return;
    const timer = window.setTimeout(() => {
      setDecodePayload(payloadTrim);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [payloadTrim, step]);

  const invoiceDecodeQuery = useQuery({
    queryKey: ["send_bolt11_decode", activeNodeId, decodePayload],
    queryFn: async () =>
      nodeBolt11Decode(activeNodeId!, { invoice: decodePayload }),
    enabled:
      !!activeNodeId && detectedKind === "invoice" && decodePayload.length > 8,
    retry: 2,
    retryDelay: 300,
  });

  const offerDecodeQuery = useQuery({
    queryKey: ["send_bolt12_offer_decode", activeNodeId, decodePayload],
    queryFn: async () =>
      nodeBolt12OfferDecode(activeNodeId!, { offer: decodePayload }),
    enabled:
      !!activeNodeId && detectedKind === "offer" && decodePayload.length > 8,
    retry: 2,
    retryDelay: 300,
  });

  const invoiceRawDecodeQuery = useQuery({
    queryKey: ["send_bolt11_decode_raw", activeNodeId, decodePayload],
    queryFn: async (): Promise<RawBolt11DecodeResponse | null> => {
      const resp = await nodeMainHttp(activeNodeId!, {
        method: "POST",
        path: "/bolt11/decode",
        headers: { "content-type": "application/json" },
        bodyText: JSON.stringify({ invoice: decodePayload }),
      });
      if (!resp.ok) {
        throw new Error(
          `raw decode failed: status=${resp.status} body=${resp.body.slice(
            0,
            200
          )}`
        );
      }
      try {
        return JSON.parse(resp.body) as RawBolt11DecodeResponse;
      } catch {
        throw new Error("raw decode returned invalid JSON");
      }
    },
    enabled:
      !!activeNodeId && detectedKind === "invoice" && decodePayload.length > 8,
    retry: 1,
    retryDelay: 200,
  });

  const rgbInvoiceDecodeQuery = useQuery({
    queryKey: ["send_rgb_ln_invoice_decode", activeNodeId, decodePayload],
    queryFn: async (): Promise<RawRgbLnInvoiceDecodeResponse | null> => {
      const resp = await nodeMainHttp(activeNodeId!, {
        method: "POST",
        path: "/rgb/ln/invoice/decode",
        headers: { "content-type": "application/json" },
        bodyText: JSON.stringify({ invoice: decodePayload }),
      });
      if (!resp.ok) {
        throw new Error(
          `rgb decode failed: status=${resp.status} body=${resp.body.slice(
            0,
            200
          )}`
        );
      }
      try {
        return JSON.parse(resp.body) as RawRgbLnInvoiceDecodeResponse;
      } catch {
        throw new Error("rgb decode returned invalid JSON");
      }
    },
    enabled:
      !!activeNodeId && detectedKind === "invoice" && decodePayload.length > 8,
    retry: 1,
    retryDelay: 200,
  });
  const rgbContractsQuery = useQuery({
    queryKey: ["send_onchain_rgb_contracts", activeNodeId],
    queryFn: async () => nodeRgbContracts(activeNodeId!),
    enabled:
      !!activeNodeId &&
      (detectedKind === "onchain_asset" || detectedKind === "invoice"),
    retry: 1,
    retryDelay: 200,
  });
  const onchainInvoiceDecodeQuery = useQuery({
    queryKey: ["send_rgb_onchain_invoice_decode", activeNodeId, decodePayload],
    queryFn: async (): Promise<RawRgbOnchainInvoiceDecodeResponse | null> => {
      const resp = await nodeMainHttp(activeNodeId!, {
        method: "POST",
        path: "/rgb/onchain/invoice/decode",
        headers: { "content-type": "application/json" },
        bodyText: JSON.stringify({ invoice: decodePayload }),
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
      detectedKind === "onchain_asset" &&
      decodePayload.length > 8,
    retry: 1,
    retryDelay: 200,
  });
  const isRgbInvoice =
    detectedKind === "invoice" &&
    hasRgbInvoiceFields(rgbInvoiceDecodeQuery.data);
  const isOnchainRgbAsset = detectedKind === "onchain_asset";
  const onchainContractPrecision = useMemo(() => {
    const contractId = onchainInvoiceDecodeQuery.data?.contract_id?.trim();
    if (!contractId) return 0;
    const contract = (rgbContractsQuery.data?.contracts ?? []).find(
      (c) => c.contract_id === contractId
    );
    return contract?.precision ?? 0;
  }, [
    rgbContractsQuery.data?.contracts,
    onchainInvoiceDecodeQuery.data?.contract_id,
  ]);
  const decodedOnchainAmount = useMemo(
    () => toU64Text(onchainInvoiceDecodeQuery.data?.amount),
    [onchainInvoiceDecodeQuery.data?.amount]
  );
  const decodedOnchainAmountDisplay = useMemo(() => {
    if (!decodedOnchainAmount) return null;
    return formatRgbAtomicAmount(
      decodedOnchainAmount,
      onchainContractPrecision
    );
  }, [decodedOnchainAmount, onchainContractPrecision]);

  const decodedAmountMsat = useMemo(() => {
    if (detectedKind === "onchain_asset") return decodedOnchainAmountDisplay;
    if (isRgbInvoice) return rgbInvoiceDecodeQuery.data?.asset_amount ?? null;
    if (detectedKind === "invoice" && invoiceDecodeQuery.data) {
      return invoiceDecodeQuery.data.amount_msat
        ? invoiceDecodeQuery.data.amount_msat.toString()
        : null;
    }
    if (detectedKind === "invoice" && invoiceRawDecodeQuery.data) {
      return invoiceRawDecodeQuery.data.amount_msat ?? null;
    }
    if (detectedKind === "offer" && offerDecodeQuery.data) {
      return offerDecodeQuery.data.amount_msat
        ? offerDecodeQuery.data.amount_msat.toString()
        : null;
    }
    return null;
  }, [
    isRgbInvoice,
    rgbInvoiceDecodeQuery.data?.asset_amount,
    detectedKind,
    invoiceDecodeQuery.data,
    invoiceRawDecodeQuery.data,
    offerDecodeQuery.data,
    decodedOnchainAmountDisplay,
  ]);

  useEffect(() => {
    if (step !== "form") return;
    if (detectedKind !== "offer") {
      if (offerAmountMsat) setOfferAmountMsat("");
      return;
    }
    if (decodedAmountMsat && !offerAmountMsat.trim()) {
      setOfferAmountMsat(decodedAmountMsat);
    }
  }, [decodedAmountMsat, detectedKind, offerAmountMsat, step]);

  const resolvedOnchainFeeRate = useMemo(() => {
    const feeRateText = onchainFeeRate.trim();
    if (!feeRateText) return 20;
    if (!isDigits(feeRateText)) return null;
    const feeRate = Number.parseInt(feeRateText, 10);
    if (!Number.isSafeInteger(feeRate) || feeRate <= 0) return null;
    return feeRate;
  }, [onchainFeeRate]);

  const decodedCarrierAmountMsat = useMemo(
    () =>
      isRgbInvoice
        ? rgbInvoiceDecodeQuery.data?.carrier_amount_msat ?? null
        : null,
    [isRgbInvoice, rgbInvoiceDecodeQuery.data?.carrier_amount_msat]
  );

  const decodedRgbAssetId = useMemo(
    () => (isRgbInvoice ? rgbInvoiceDecodeQuery.data?.asset_id ?? null : null),
    [isRgbInvoice, rgbInvoiceDecodeQuery.data?.asset_id]
  );
  const decodedRgbAmountUnit = useMemo(() => {
    if (isRgbInvoice) {
      const assetId = decodedRgbAssetId?.trim();
      if (!assetId) return "RGB";
      const asset = (rgbContractsQuery.data?.contracts ?? []).find(
        (c) => c.asset_id === assetId
      );
      return asset?.ticker?.trim() || "RGB";
    }
    if (isOnchainRgbAsset) {
      const contractId = onchainInvoiceDecodeQuery.data?.contract_id?.trim();
      if (!contractId) return "RGB";
      const contract = (rgbContractsQuery.data?.contracts ?? []).find(
        (c) => c.contract_id === contractId
      );
      return contract?.ticker?.trim() || "RGB";
    }
    return "RGB";
  }, [
    decodedRgbAssetId,
    isOnchainRgbAsset,
    isRgbInvoice,
    onchainInvoiceDecodeQuery.data?.contract_id,
    rgbContractsQuery.data?.contracts,
  ]);

  const decodedDescription = useMemo(() => {
    if (isRgbInvoice) return "(RGB invoice)";
    if (detectedKind === "offer") {
      return offerDecodeQuery.data?.description?.trim() || null;
    }
    if (detectedKind !== "invoice") return null;
    const desc = invoiceRawDecodeQuery.data?.description?.trim();
    if (desc) return desc;
    if (invoiceRawDecodeQuery.data?.description_hash) {
      return "(description_hash invoice)";
    }
    return null;
  }, [
    isRgbInvoice,
    detectedKind,
    invoiceRawDecodeQuery.data?.description,
    invoiceRawDecodeQuery.data?.description_hash,
    offerDecodeQuery.data?.description,
  ]);

  const isDecoding =
    onchainInvoiceDecodeQuery.isFetching ||
    invoiceDecodeQuery.isFetching ||
    invoiceRawDecodeQuery.isFetching ||
    offerDecodeQuery.isFetching ||
    rgbInvoiceDecodeQuery.isFetching;
  const invoiceDecodeSucceeded =
    !!invoiceDecodeQuery.data || !!invoiceRawDecodeQuery.data;
  const decodeError = useMemo(() => {
    if (detectedKind === "onchain_asset")
      return onchainInvoiceDecodeQuery.error;
    if (detectedKind === "offer") return offerDecodeQuery.error;
    if (detectedKind !== "invoice") return null;
    if (isRgbInvoice || invoiceDecodeSucceeded) return null;
    return (
      rgbInvoiceDecodeQuery.error ??
      invoiceDecodeQuery.error ??
      invoiceRawDecodeQuery.error ??
      null
    );
  }, [
    detectedKind,
    onchainInvoiceDecodeQuery.error,
    isRgbInvoice,
    rgbInvoiceDecodeQuery.error,
    invoiceDecodeQuery.error,
    invoiceDecodeSucceeded,
    invoiceRawDecodeQuery.error,
    offerDecodeQuery.error,
  ]);
  const decodeHasError = detectedKind !== "unknown" && !!decodeError;
  const decodeErrorText = decodeError ? errorToText(decodeError) : "";
  const decodeErrorWithContext = decodeErrorText
    ? `${decodeErrorText} (current: ${activeContextLabel})`
    : "";
  const canSendWithDecodeFailure =
    decodeHasError &&
    decodeErrorText.toLowerCase().includes("http request failed");
  const resolvedOfferAmountMsat = useMemo(() => {
    if (detectedKind !== "offer") return null;
    const manualAmount = offerAmountMsat.trim();
    if (manualAmount) return manualAmount;
    return decodedAmountMsat !== null ? decodedAmountMsat : null;
  }, [decodedAmountMsat, detectedKind, offerAmountMsat]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) throw new Error("No active node selected");
      const body = payloadTrim;
      const kind = detectPayloadKind(body);
      if (kind === "unknown") {
        throw new Error(
          "Unsupported payment request. Please input a Lightning invoice, Lightning offer, or RGB onchain invoice."
        );
      }

      if (kind === "onchain_asset") {
        const feeRate = resolvedOnchainFeeRate;
        if (feeRate === null) {
          throw new Error("Fee rate must be a whole number > 0 (sats/vB).");
        }
        const resp = await nodeRgbOnchainSend(activeNodeId, {
          invoice: body,
          fee_rate_sats_per_vb: feeRate,
        });
        return {
          paymentId: resp.txid,
          amountText: decodedAmountMsat
            ? `${decodedAmountMsat} ${decodedRgbAmountUnit}`
            : "-",
          typeText: "RGB Onchain invoice",
          extraText: `Consignment key: ${resp.consignment_key}`,
        };
      }

      if (kind === "invoice") {
        if (isRgbInvoice) {
          const resp = await nodeRgbLnPay(activeNodeId, { invoice: body });
          const assetAmount =
            rgbInvoiceDecodeQuery.data?.asset_amount ?? "(unknown)";
          const assetId = rgbInvoiceDecodeQuery.data?.asset_id ?? "-";
          return {
            paymentId: resp.payment_id,
            amountText: `${assetAmount} ${decodedRgbAmountUnit}`,
            typeText: "RGB Lightning invoice",
            extraText: `Asset: ${assetId}`,
          };
        }
        if (decodedAmountMsat === null) {
          if (canSendWithDecodeFailure) {
            const resp = await nodeBolt11Send(activeNodeId, { invoice: body });
            return {
              paymentId: resp.payment_id,
              amountText: "(unknown) msat",
              typeText: "Lightning invoice",
              extraText: "",
            };
          }
          throw new Error("Variable-amount invoice is not supported.");
        }
        const resp = await nodeBolt11Send(activeNodeId, { invoice: body });
        return {
          paymentId: resp.payment_id,
          amountText: `${decodedAmountMsat} msat`,
          typeText: "Lightning invoice",
          extraText: "",
        };
      }

      const resp = await nodeBolt12OfferSend(activeNodeId, {
        offer: body,
        amount_msat:
          resolvedOfferAmountMsat !== null
            ? u64(resolvedOfferAmountMsat)
            : null,
        quantity: null,
        payer_note: description.trim() ? description.trim() : null,
      });
      return {
        paymentId: resp.payment_id,
        amountText: resolvedOfferAmountMsat
          ? `${resolvedOfferAmountMsat} msat`
          : "(unknown) msat",
        typeText: "Lightning offer",
        extraText: "",
      };
    },
    onSuccess: (resp) => {
      setPaymentId(resp.paymentId);
      setSentAmountText(resp.amountText);
      setSentTypeText(resp.typeText);
      setSentExtraText(resp.extraText);
      setPayload("");
      setOfferAmountMsat("");
      setOnchainFeeRate("");
      setStep("result");
    },
  });

  const validationError = useMemo(() => {
    if (!activeNodeId) return "No active node selected.";
    const body = payloadTrim;
    if (!body) return "Invoice / Offer is required.";
    if (detectedKind === "unknown")
      return "Only Lightning invoice (ln...), offer (lno...), or RGB onchain invoice (contract:...) is supported.";
    if (
      isOnchainRgbAsset &&
      onchainFeeRate.trim() &&
      resolvedOnchainFeeRate === null
    ) {
      return "Fee Rate must be a whole number > 0 (sats/vB).";
    }
    if (isDecoding) return "Decoding payment request...";
    if (decodeHasError && !canSendWithDecodeFailure)
      return `Invalid payment request: ${decodeErrorWithContext}`;
    if (detectedKind === "offer" && resolvedOfferAmountMsat === null) {
      return "Amount is required for variable-amount offer.";
    }
    if (
      detectedKind === "offer" &&
      offerAmountMsat.trim() &&
      (!isDigits(offerAmountMsat) || offerAmountMsat.trim() === "0")
    ) {
      return "Offer amount must be a whole number > 0 (msat).";
    }
    if (
      !decodeHasError &&
      detectedKind === "invoice" &&
      decodedAmountMsat === null
    ) {
      return "Variable-amount invoice is not supported.";
    }
    return null;
  }, [
    activeNodeId,
    canSendWithDecodeFailure,
    decodedAmountMsat,
    decodeErrorWithContext,
    decodeHasError,
    detectedKind,
    isDecoding,
    isOnchainRgbAsset,
    onchainFeeRate,
    offerAmountMsat,
    payloadTrim,
    resolvedOnchainFeeRate,
    resolvedOfferAmountMsat,
  ]);

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          if (step === "form") {
            goBackRoot();
            return;
          }
          if (step === "confirm") {
            setStep("form");
            return;
          }
          setStep("confirm");
        }}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Send BTC / RGB</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "form" ? (
            <>
              <Field>
                <FieldLabel htmlFor="send_payload">
                  Lightning Invoice / Lightning Offer / RGB Lightning Invoice /
                  RGB Onchain Invoice
                </FieldLabel>
                <Textarea
                  id="send_payload"
                  value={payload}
                  onChange={(e) => setPayload(e.currentTarget.value)}
                  placeholder="Paste lnbcrt... / lno1... / contract:..."
                  className="min-h-[120px] resize-y"
                />
              </Field>

              {payloadTrim ? (
                <div className="rounded-md border p-3 text-sm space-y-1">
                  <div>
                    Type:{" "}
                    <span className="font-medium">
                      {detectedKind === "invoice"
                        ? isRgbInvoice
                          ? "RGB Lightning invoice"
                          : "Lightning invoice"
                        : detectedKind === "onchain_asset"
                        ? "RGB Onchain invoice"
                        : detectedKind === "offer"
                        ? "Lightning offer"
                        : "Unknown"}
                    </span>
                  </div>
                  <div>
                    Amount:{" "}
                    <span className="font-medium">
                      {isDecoding
                        ? "Decoding..."
                        : isOnchainRgbAsset
                        ? decodedAmountMsat
                          ? `${decodedAmountMsat} ${decodedRgbAmountUnit}`
                          : decodeHasError
                          ? "Decode failed"
                          : "-"
                        : decodeHasError
                        ? "Decode failed"
                        : detectedKind === "offer"
                        ? resolvedOfferAmountMsat
                          ? `${resolvedOfferAmountMsat} msat`
                          : "Variable amount"
                        : decodedAmountMsat
                        ? isRgbInvoice
                          ? `${decodedAmountMsat} ${decodedRgbAmountUnit}`
                          : `${decodedAmountMsat} msat`
                        : detectedKind === "unknown"
                        ? "-"
                        : "Variable amount"}
                    </span>
                  </div>
                  {isRgbInvoice && decodedCarrierAmountMsat ? (
                    <div>
                      Carrier:{" "}
                      <span className="font-medium">
                        {decodedCarrierAmountMsat} msat
                      </span>
                    </div>
                  ) : null}
                  {isRgbInvoice && decodedRgbAssetId ? (
                    <div>
                      Asset:{" "}
                      <span className="font-medium break-all">
                        {decodedRgbAssetId}
                      </span>
                    </div>
                  ) : null}
                  <div>
                    Description:{" "}
                    <span className="font-medium">
                      {isOnchainRgbAsset
                        ? "(RGB onchain invoice)"
                        : decodedDescription ?? "-"}
                    </span>
                  </div>
                  {decodeHasError ? (
                    <div className="text-xs text-destructive break-all">
                      Reason: {decodeErrorWithContext}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {detectedKind === "offer" ? (
                <Field>
                  <FieldLabel htmlFor="send_desc">Description</FieldLabel>
                  <Input
                    id="send_desc"
                    value={description}
                    onChange={(e) => setDescription(e.currentTarget.value)}
                    placeholder="Pay BTC"
                  />
                </Field>
              ) : null}
              {detectedKind === "offer" ? (
                <Field>
                  <FieldLabel htmlFor="send_offer_amount_msat">
                    Amount (msat)
                  </FieldLabel>
                  <Input
                    id="send_offer_amount_msat"
                    value={offerAmountMsat}
                    onChange={(e) => setOfferAmountMsat(e.currentTarget.value)}
                    placeholder={
                      decodedAmountMsat
                        ? decodedAmountMsat
                        : "Required for variable-amount offer"
                    }
                    inputMode="numeric"
                  />
                </Field>
              ) : null}
              {isOnchainRgbAsset ? (
                <Field>
                  <FieldLabel htmlFor="send_onchain_fee_rate">
                    Fee Rate (sats/vB)
                  </FieldLabel>
                  <Input
                    id="send_onchain_fee_rate"
                    value={onchainFeeRate}
                    onChange={(e) => setOnchainFeeRate(e.currentTarget.value)}
                    placeholder="20"
                    inputMode="numeric"
                  />
                </Field>
              ) : null}

              {payload && validationError ? (
                <Alert variant="destructive">
                  <AlertTitle>Invalid input</AlertTitle>
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              ) : null}
              {canSendWithDecodeFailure ? (
                <Alert>
                  <AlertTitle>Decode unavailable</AlertTitle>
                  <AlertDescription>
                    Decode failed due network reachability, but you can still
                    send directly using the payment request.
                  </AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="button"
                className="w-full mt-4"
                disabled={!!validationError}
                onClick={() => setStep("confirm")}
              >
                Pay
              </Button>
            </>
          ) : null}

          {step === "confirm" ? (
            <>
              <div className="rounded-md border p-4 space-y-2 text-sm">
                <div>
                  Type:{" "}
                  <span className="font-medium">
                    {detectedKind === "invoice"
                      ? isRgbInvoice
                        ? "RGB Lightning invoice"
                        : "Lightning invoice"
                      : detectedKind === "onchain_asset"
                      ? "RGB Onchain invoice"
                      : "Lightning offer"}
                  </span>
                </div>
                <div>
                  Amount:{" "}
                  <span className="font-medium">
                    {detectedKind === "onchain_asset"
                      ? decodedAmountMsat
                        ? `${decodedAmountMsat} ${decodedRgbAmountUnit}`
                        : "-"
                      : detectedKind === "offer"
                      ? resolvedOfferAmountMsat
                        ? `${resolvedOfferAmountMsat} msat`
                        : "(unknown)"
                      : decodedAmountMsat
                      ? isRgbInvoice
                        ? `${decodedAmountMsat} ${decodedRgbAmountUnit}`
                        : `${decodedAmountMsat} msat`
                      : "(unknown)"}
                  </span>
                </div>
                {isRgbInvoice && decodedCarrierAmountMsat ? (
                  <div>
                    Carrier:{" "}
                    <span className="font-medium">
                      {decodedCarrierAmountMsat} msat
                    </span>
                  </div>
                ) : null}
                {isRgbInvoice && decodedRgbAssetId ? (
                  <div>
                    Asset:{" "}
                    <span className="font-medium break-all">
                      {decodedRgbAssetId}
                    </span>
                  </div>
                ) : null}
                <div>
                  Description:{" "}
                  <span className="font-medium">
                    {isOnchainRgbAsset
                      ? "(RGB onchain invoice)"
                      : decodedDescription ?? "-"}
                  </span>
                </div>
                {isOnchainRgbAsset ? (
                  <div>
                    Fee Rate:{" "}
                    <span className="font-medium">
                      {resolvedOnchainFeeRate ?? "-"} sats/vB
                    </span>
                  </div>
                ) : null}
                <div>
                  Payment Request:
                  <code className="mt-1 block break-all rounded-md text-xs">
                    {payloadTrim}
                  </code>
                </div>
              </div>

              {sendMutation.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Send failed</AlertTitle>
                  <AlertDescription>
                    {errorToText(sendMutation.error)}
                  </AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="button"
                className="w-full mt-4"
                disabled={sendMutation.isPending}
                onClick={() => sendMutation.mutate()}
              >
                {sendMutation.isPending ? "Sending..." : "Confirm Pay"}
              </Button>
            </>
          ) : null}

          {step === "result" && paymentId ? (
            <>
              <div className="rounded-md border p-4 space-y-2">
                <div className="flex justify-center pb-5">
                  <CircleCheckBig className="h-20 w-20 text-green-600" />
                </div>
                <div className="text-sm">Payment ID: {paymentId}</div>
                <div className="text-sm">Type: {sentTypeText || "-"}</div>
                <div className="text-sm">Amount: {sentAmountText || "-"}</div>
                {sentExtraText ? (
                  <div className="text-sm break-all">{sentExtraText}</div>
                ) : null}
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={async () => {
                  await navigator.clipboard.writeText(paymentId);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1200);
                }}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy Payment ID"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={async () => {
                  goBackRoot();
                }}
              >
                Back
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
