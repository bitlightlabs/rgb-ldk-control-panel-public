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
  nodeRgbLnPay,
  nodeRgbOnchainSend,
  nodeRgbOnchainTransferConsignmentDownload,
} from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import { u64 } from "@/lib/sdk";
import { ArrowLeft, Check, CircleCheckBig, Copy } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { base64ToUint8Array } from "@/lib/utils";
import { writeFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";

type PayloadKind = "invoice" | "offer" | "unknown";
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

export function SendBtcPage({ onBackRoot }: { onBackRoot: () => void }) {
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const [step, setStep] = useState<SendStep>("form");
  const [payload, setPayload] = useState("");
  const [decodePayload, setDecodePayload] = useState("");
  const [description, setDescription] = useState("Pay BTC");
  const [offerAmountMsat, setOfferAmountMsat] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [sentAmountText, setSentAmountText] = useState("");
  const [sentTypeText, setSentTypeText] = useState("");
  const [sentExtraText, setSentExtraText] = useState("");
  const [copied, setCopied] = useState(false);
  const [onchainInvoice, setOnchainInvoice] = useState("");
  const [onchainFeeRate, setOnchainFeeRate] = useState("");
  const [onchainConsignmentKey, setOnchainConsignmentKey] = useState("");
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
  const isRgbInvoice =
    detectedKind === "invoice" && hasRgbInvoiceFields(rgbInvoiceDecodeQuery.data);

  const decodedAmountMsat = useMemo(() => {
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
    invoiceDecodeQuery.isFetching ||
    invoiceRawDecodeQuery.isFetching ||
    offerDecodeQuery.isFetching ||
    rgbInvoiceDecodeQuery.isFetching;
  const invoiceDecodeSucceeded =
    !!invoiceDecodeQuery.data || !!invoiceRawDecodeQuery.data;
  const decodeError = useMemo(() => {
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
          "Unsupported payment request. Please input a Lightning invoice or offer."
        );
      }

      if (kind === "invoice") {
        if (isRgbInvoice) {
          const resp = await nodeRgbLnPay(activeNodeId, { invoice: body });
          const assetAmount =
            rgbInvoiceDecodeQuery.data?.asset_amount ?? "(unknown)";
          const assetId = rgbInvoiceDecodeQuery.data?.asset_id ?? "-";
          return {
            paymentId: resp.payment_id,
            amountText: `${assetAmount} RGB`,
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
          resolvedOfferAmountMsat !== null ? u64(resolvedOfferAmountMsat) : null,
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
      setStep("result");
    },
  });

  const validationError = useMemo(() => {
    if (!activeNodeId) return "No active node selected.";
    const body = payloadTrim;
    if (!body) return "Invoice / Offer is required.";
    if (detectedKind === "unknown")
      return "Only Lightning invoice (ln...) or offer (lno...) is supported.";
    if (isDecoding) return "Decoding payment request...";
    if (decodeHasError && !canSendWithDecodeFailure)
      return `Invalid payment request: ${decodeErrorWithContext}`;
    if (
      detectedKind === "offer" &&
      resolvedOfferAmountMsat === null
    ) {
      return "Amount is required for variable-amount offer.";
    }
    if (
      detectedKind === "offer" &&
      offerAmountMsat.trim() &&
      (!isDigits(offerAmountMsat) || offerAmountMsat.trim() === "0")
    ) {
      return "Offer amount must be a whole number > 0 (msat).";
    }
    if (!decodeHasError && detectedKind === "invoice" && decodedAmountMsat === null) {
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
    offerAmountMsat,
    payloadTrim,
    resolvedOfferAmountMsat,
  ]);

  const onChainPayMutation = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) throw new Error("No active node selected");
      if (!onchainInvoice.trim()) throw new Error("Onchain invoice is required");

      return nodeRgbOnchainSend(activeNodeId, {
        invoice: onchainInvoice.trim(),
        fee_rate_sats_per_vb: onchainFeeRate.trim() ? parseInt(onchainFeeRate.trim()) : 20,
      })
    },
    onSuccess:  (resp) => {
      setOnchainConsignmentKey(resp.consignment_key)
    }
  });

  const deliverOnchainPayConsignment = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) throw new Error("No active node selected");
      if (!onchainConsignmentKey) throw new Error("No consignment key available from onchain pay response");

      // Download consignment
      const data = await nodeRgbOnchainTransferConsignmentDownload(activeNodeId, onchainConsignmentKey)
      // Svae file
      const path = await save({
        defaultPath: "transfer_consignment.raw"
      });
      if (!path) {
        throw new Error("File save cancelled by user");
      };
      const bytes = base64ToUint8Array(data.archive_base64);
      await writeFile(path, bytes);
    },
    onSuccess: () => {
      toast.success("Consignment downloaded successfully.");
    },
    onError: (e) => {
      toast.error((e as Error).message);
    }
  });

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          if (step === "form") {
            onBackRoot();
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
                  Lightning Invoice / Lightning Offer / RGB Lightning Invoice
                </FieldLabel>
                <Textarea
                  id="send_payload"
                  value={payload}
                  onChange={(e) => setPayload(e.currentTarget.value)}
                  placeholder="Paste lnbcrt... or lno1..."
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
                        : decodeHasError
                        ? "Decode failed"
                        : detectedKind === "offer"
                        ? resolvedOfferAmountMsat
                          ? `${resolvedOfferAmountMsat} msat`
                          : "Variable amount"
                        : decodedAmountMsat
                        ? isRgbInvoice
                          ? `${decodedAmountMsat} RGB`
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
                      {decodedDescription ?? "-"}
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
                      : "Lightning offer"}
                  </span>
                </div>
                <div>
                  Amount:{" "}
                  <span className="font-medium">
                    {detectedKind === "offer"
                      ? resolvedOfferAmountMsat
                        ? `${resolvedOfferAmountMsat} msat`
                        : "(unknown)"
                      : decodedAmountMsat
                      ? isRgbInvoice
                        ? `${decodedAmountMsat} RGB`
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
                    {decodedDescription ?? "-"}
                  </span>
                </div>
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
                  onBackRoot();
                }}
              >
                Back
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* <Card className="mt-3">
        <CardHeader>
          <CardTitle>Onchain Invoice Send</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {
            onchainConsignmentKey ? (
              <>
                <Field>
                  <FieldLabel>Consignment Key</FieldLabel>
                  <Input
                    placeholder="sats/vB (default 20)"
                    value={onchainConsignmentKey}
                    onChange={(e) => setOnchainConsignmentKey(e.target.value)}
                  />
                </Field>
                <Button
                  disabled={!onchainConsignmentKey || deliverOnchainPayConsignment.isPending}
                  className="mt-4 w-full"
                  onClick={() => deliverOnchainPayConsignment.mutate()}
                >Download Transfer Consignment</Button>
              </>
            ) : (
              <>
                <Field>
                  <FieldLabel>Onchain Invoice</FieldLabel>
                  <Textarea
                    value={onchainInvoice}
                    placeholder="Paste onchain invoice"
                    className="min-h-[120px] resize-y"
                    onChange={(e) => setOnchainInvoice(e.target.value)}
                    />
                </Field>
                <Field>
                  <FieldLabel>Fee Rate</FieldLabel>
                  <Input
                    placeholder="sats/vB (default 20)"
                    value={onchainFeeRate}
                    onChange={(e) => setOnchainFeeRate(e.target.value)}
                  />
                </Field>
                <Button disabled={!onchainInvoice || onChainPayMutation.isPending} className="mt-4 w-full" onClick={() => onChainPayMutation.mutate()}>Pay</Button>
              </>
            )
          }

         <div className="mt-3">
            {
              onChainPayMutation.isError ? (
                <span>{onChainPayMutation.error.message}</span>
              ) : null
            }
         </div>
        </CardContent>
      </Card> */}
    </div>
  );
}
