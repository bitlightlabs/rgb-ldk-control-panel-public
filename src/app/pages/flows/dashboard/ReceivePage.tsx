import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNodeStore } from "@/app/stores/nodeStore";
import {
  nodeBolt11Receive,
  nodeBolt12OfferReceiveVar,
  nodeRgbContracts,
  nodeRgbLnInvoiceCreate,
  nodeRgbOnchainInvoiceCreate,
  nodeRgbSync,
  nodeWalletNewAddress,
  // nodeUnlock,
} from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import { u64 } from "@/lib/sdk";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import IconLightning from "@/app/icons/lightning";
import IconInvoiceOffer from "@/app/icons/invoice-offer";
import IconInvoice from "@/app/icons/invoice";
import IconLink from "@/app/icons/link";
import ResultReceiveRGB from "./ResultReceiveRGB";
import ResultBolt11Invoice from "./ResultBolt11Invoice";
import OfferForm from "./OfferForm";
import InvoiceForm from "./InvoiceForm";
import OnchainInvoiceRGBForm from "./OnchainInvoiceRGBForm";
import RGBInvoiceForm from "./RGBInvoiceForm";
import ResultOnchainBtc from "./ResultOnchainBtc";
import ResultReceiveOnchainRGB from "./ResultReceiveOnchainRGB";
import ResultBolt12Invoice from "./ResultBolt12Invoice";

type ReceiveMode =
  | "invoice"
  | "offer"
  | "rgb_invoice"
  | "rgb_onchain_invoice"
  | "btc_onchain_address";
type ReceiveStep = "select" | "form" | "result";

function isDigits(s: string): boolean {
  return /^\d+$/.test(s.trim());
}

export function ReceivePage({ onBackRoot }: { onBackRoot?: () => void }) {
  const navigate = useNavigate();
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const [step, setStep] = useState<ReceiveStep>("select");
  const [mode, setMode] = useState<ReceiveMode | null>(null);
  const [amountSat, setAmountSat] = useState("5000");
  const [description, setDescription] = useState("Receive BTC");
  const [createdValue, setCreatedValue] = useState("");
  const [createdAmountMsat, setCreatedAmountMsat] = useState("");
  // const [copied, setCopied] = useState(false);
  const [rgbContractId, setRgbContractId] = useState("");
  const [rgbAssetAmount, setRgbAssetAmount] = useState("21");
  const [rgbCarrierAmountSat, setRgbCarrierAmountSat] = useState("5000");
  const [currentRgbUtxo, setCurrentRgbUtxo] = useState("");
  const [currentOnchainContractId, setCurrentOnchainContractId] = useState(""); // onchain

  const rgbContractsQuery = useQuery({
    queryKey: ["receive_rgb_contracts", activeNodeId],
    queryFn: async () => {
      // await nodeUnlock(activeNodeId!);
      await nodeRgbSync(activeNodeId!);
      return nodeRgbContracts(activeNodeId!);
    },
    enabled:
      !!activeNodeId &&
      (mode === "rgb_invoice" || mode === "rgb_onchain_invoice"),
    refetchInterval: false,
  });

  const selectedRgbContract = useMemo(
    () =>
      (rgbContractsQuery.data?.contracts ?? []).find(
        (c) => c.contract_id === rgbContractId
      ) ?? null,
    [rgbContractId, rgbContractsQuery.data?.contracts]
  );
  const selectedOnchainRgbContract = useMemo(
    () =>
      (rgbContractsQuery.data?.contracts ?? []).find(
        (c) => c.contract_id === currentOnchainContractId
      ) ?? null,
    [currentOnchainContractId, rgbContractsQuery.data?.contracts]
  );
  // const createdRgbAmountUnit = useMemo(() => {
  //   if (mode === "rgb_invoice") {
  //     return selectedRgbContract?.ticker?.trim() || "RGB";
  //   }
  //   if (mode === "rgb_onchain_invoice") {
  //     return selectedOnchainRgbContract?.ticker?.trim() || "RGB";
  //   }
  //   return "RGB";
  // }, [mode, selectedOnchainRgbContract?.ticker, selectedRgbContract?.ticker]);

  useEffect(() => {
    if (mode !== "rgb_invoice") return;
    if (rgbContractId.trim()) return;
    const first = rgbContractsQuery.data?.contracts?.[0];
    if (first?.contract_id) {
      setRgbContractId(first.contract_id);
    }
  }, [mode, rgbContractId, rgbContractsQuery.data?.contracts]);

  const createMutation = useMutation({
    mutationFn: async (targetMode?: ReceiveMode) => {
      if (!activeNodeId) throw new Error("No active node selected");
      const receiveMode = targetMode ?? mode;
      const amount = amountSat.trim();
      const desc = description.trim() || "Receive BTC";

      // onchain receive rgb
      if (receiveMode === "rgb_onchain_invoice") {
        const asset = rgbContractsQuery.data?.contracts.find(
          (c) => c.contract_id === currentOnchainContractId
        );
        const precision = asset?.precision ?? 0;

        const resp = await nodeRgbOnchainInvoiceCreate(activeNodeId, {
          contract_id: currentOnchainContractId,
          amount: u64(Number(rgbAssetAmount.trim()) * 10 ** precision),
          use_witness_utxo: false,
          blinding_utxo: currentRgbUtxo.trim(),
        });

        return { value: resp.invoice, amount: rgbAssetAmount.trim() };
      }

      // btc onchain address
      if (receiveMode === "btc_onchain_address") {
        const resp = await nodeWalletNewAddress(activeNodeId);
        return { value: resp.address, amount: "" };
      }

      // rgb invoice
      if (receiveMode === "rgb_invoice") {
        const asset = rgbContractsQuery.data?.contracts.find(
          (c) => c.contract_id === rgbContractId
        );
        const precision = asset?.precision ?? 0;

        const resp = await nodeRgbLnInvoiceCreate(activeNodeId, {
          contract_id: rgbContractId.trim(),
          asset_amount: BigInt(Number(rgbAssetAmount.trim()) * 10 ** precision).toString(),
          description: desc,
          expiry_secs: 3600,
          btc_carrier_amount_msat: (BigInt(rgbCarrierAmountSat.trim()) * 1000n).toString(),
        });
        return { value: resp.invoice, amount: rgbAssetAmount.trim() };
      }

      // bolt11 invoice
      if (receiveMode === "invoice") {
        const resp = await nodeBolt11Receive(activeNodeId, {
          amount_msat: u64(amount).mul(1000),
          description: desc,
          expiry_secs: 3600,
        });
        return { value: resp.invoice, amount: (BigInt(amount) * 1000n).toString() };
      }

      // bolt12 offer with variable amount
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
      if (!rgbContractId.trim()) return "RGB contract is required.";
      if (!isDigits(rgbAssetAmount.trim()))
        return "RGB amount must be an integer.";
      if (rgbAssetAmount.trim() === "0")
        return "RGB amount must be greater than 0.";
      if (!isDigits(rgbCarrierAmountSat.trim()))
        return "BTC carrier must be an integer (msat).";
      if (rgbCarrierAmountSat.trim() === "0")
        return "BTC carrier must be greater than 0.";
      return null;
    }
    if (mode === "btc_onchain_address") return null;
    if (mode === "offer") return null;
    const amount = amountSat.trim();
    if (!amount) return "Amount (sat) is required.";
    if (!isDigits(amount)) return "Amount must be an integer (sat).";
    if (amount === "0") return "Amount must be greater than 0.";
    return null;
  }, [
    activeNodeId,
    amountSat,
    mode,
    rgbAssetAmount,
    rgbContractId,
    rgbCarrierAmountSat,
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
        : mode === "btc_onchain_address"
        ? "Create BTC OnChain address"
        : ""
      : "Receive BTC / RGB";

  const goBackRoot = () => {
    if (onBackRoot) {
      onBackRoot();
      return;
    }
    // navigate("/dashboard");
    navigate(-1);
  };

  return (
    <ContentWrapper >
      <ContentHeader
        title={title}
        onBack={() => {
          if (step === "select") {
            goBackRoot();
            return;
          }
          if (step === "form") {
            setStep("select");
            setMode(null);
            return;
          }
          if (mode === "btc_onchain_address") {
            setStep("select");
            setMode(null);
            return;
          }
          setStep("form");
        }}
      />
      <Content>
        <div className="space-y-4">
          {step === "select" ? (
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-3 rounded-lg">
                <div className="text-sm text-secondary-foreground">
                  Lightning
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-[66px] w-full rounded-2xl justify-between p-5"
                  onClick={() => {
                    setMode("rgb_invoice");
                    setDescription("Receive RGB");
                    setStep("form");
                  }}
                >
                  <div className="flex gap-4 items-center">
                    <span className="w-6 h-6"><IconLightning style={{width: 'auto', height: '100%'}} /></span>
                    <div className="text-left">
                      <div className="text-sm text-foreground">RGB Lightning</div>
                      <div className="mt-1 text-secondary-foreground font-normal">Receive RGB instantly via Lightning Network</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-[66px] w-full rounded-2xl justify-between p-5"
                  onClick={() => {
                    setMode("invoice");
                    setStep("form");
                    setDescription("Receive BTC");
                  }}
                >
                  <div className="flex gap-4 items-center">
                    <span className="w-6 h-6"><IconInvoice style={{width: 'auto', height: '100%'}} /></span>
                    <div className="text-left">
                      <div className="text-sm text-foreground">Lightning Invoice</div>
                      <div className="mt-1 text-secondary-foreground font-normal">One-time payment request with instant settlement</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-[66px] w-full rounded-2xl justify-between p-5"
                  onClick={() => {
                    setMode("offer");
                    setStep("form");
                    setDescription("Receive BTC");
                  }}
                >
                  <div className="flex gap-4 items-center">
                    <span className="w-6 h-6"><IconInvoiceOffer style={{width: 'auto', height: '100%'}} /></span>
                    <div className="text-left">
                      <div className="text-sm text-foreground">Lightning Offer</div>
                      <div className="mt-1 text-secondary-foreground font-normal">Create reusable payment link for flexible amounts</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>

              <div className="space-y-3 mt-7">
                <div className="text-sm text-secondary-foreground">
                  OnChain
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-[66px] w-full rounded-2xl justify-between p-5"
                  onClick={() => {
                    setMode("btc_onchain_address");
                    setDescription("Receive BTC OnChain");
                    createMutation.mutate("btc_onchain_address");
                  }}
                >
                  <div className="flex gap-4 items-center">
                    <span className="w-6 h-6"><IconLink style={{width: 'auto', height: '100%'}} /></span>
                    <div className="text-left">
                      <div className="text-sm text-foreground">Bitcoin On-chain</div>
                      <div className="mt-1 text-secondary-foreground font-normal">On-chain deposit for large transfers</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>

                {/* <Button
                  type="button"
                  variant="secondary"
                  className="h-[66px] w-full rounded-2xl justify-between p-5"
                  onClick={() => {
                    setMode("rgb_onchain_invoice");
                    setDescription("Receive RGB OnChain");
                    setStep("form");
                  }}
                >
                    <div className="flex gap-4 items-center">
                    <IconLink />
                    <div className="text-left">
                      <div className="text-sm text-foreground">RGB OnChain Invoice</div>
                      <div className="mt-1 text-secondary-foreground font-normal">On-chain RGB deposit for large transfers</div>
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button> */}
              </div>
            </div>
          ) : null}

          {step === "form" ? (
            <>
              <div>
                {mode === "rgb_onchain_invoice" ? (
                  <OnchainInvoiceRGBForm
                    contracts={rgbContractsQuery.data?.contracts ?? []}
                    selectedContractId={currentOnchainContractId}
                    changeContractId={setCurrentOnchainContractId}
                    rgbAssetAmount={rgbAssetAmount}
                    setRgbAssetAmount={setRgbAssetAmount}
                    setCurrentRgbUtxo={setCurrentRgbUtxo}
                    description={description}
                    setDescription={setDescription}
                  />
                ) : mode === "rgb_invoice" ? (
                  // rgb ln invoice
                  <RGBInvoiceForm
                    contracts={rgbContractsQuery.data?.contracts ?? []}
                    selectedContractId={rgbContractId}
                    changeContractId={setRgbContractId}
                    rgbAmount={rgbAssetAmount}
                    setRgbAmount={setRgbAssetAmount}
                    description={description}
                    setDescription={setDescription}
                    btcCarrierSat={rgbCarrierAmountSat}
                    setBtcCarrierSat={setRgbCarrierAmountSat}
                  />
                ) : mode === "invoice" ? (
                  // bolt11 ln invoice
                  <InvoiceForm
                    amountValue={amountSat}
                    setAmountValue={setAmountSat}
                    description={description}
                    setDescription={setDescription}
                  />
                ) : mode === 'offer' ? (
                  <OfferForm
                    description={description}
                    setDescription={setDescription}
                  />
                ) : null}
              </div>

              {validationError ? (
                <Alert variant="destructive">
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              ) : null}

              {mode === "rgb_invoice" && rgbContractsQuery.isError ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {errorToText(rgbContractsQuery.error)}
                  </AlertDescription>
                </Alert>
              ) : null}

              {createMutation.isError ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {errorToText(createMutation.error)}
                  </AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="button"
                size="lg"
                variant="white"
                className="w-full mt-4 rounded-full"
                disabled={!!validationError || createMutation.isPending}
                onClick={() => createMutation.mutate(mode ?? undefined)}
              >
                {createMutation.isPending ? "Creating..." : "Create Invoice"}
              </Button>
            </>
          ) : null}

          {step === "result" && createdValue ? (
            <>
              {
                mode === 'rgb_invoice' && selectedRgbContract ? (
                  <ResultReceiveRGB
                    amount={createdAmountMsat}
                    assetName={selectedRgbContract.name ?? ''}
                    btcCarrier={rgbCarrierAmountSat}
                    btcCarrierSymbol="sat"
                    invoice={createdValue}
                  />
                ) : null
              }

              {
                mode === 'rgb_onchain_invoice' ? (
                  <ResultReceiveOnchainRGB
                    utxo={currentRgbUtxo}
                    amount={createdAmountMsat}
                    assetName={selectedOnchainRgbContract?.name ?? ''}
                    invoice={createdValue}
                  />
                ) : null
              }

              {
                mode === 'invoice' ? (
                  <ResultBolt11Invoice
                    amount={createdAmountMsat}
                    invoice={createdValue}
                    description={description}
                  />
                ) : null
              }

              {
                mode === 'offer' ? (
                  <ResultBolt12Invoice
                    invoice={createdValue}
                    description={description}
                  />
                ) : null
              }

              {
                mode === 'btc_onchain_address' ? (
                  <ResultOnchainBtc address={createdValue} />
                ) : null
              }

              <div className="space-y-2">
                {/* {createdAmountMsat || createdAmountMsat ? (
                  <div className="text-sm">
                    Amount:{" "}
                    {mode === "rgb_invoice" || mode === "rgb_onchain_invoice"
                      ? `${createdAmountMsat} ${createdRgbAmountUnit}`
                      : mode === "offer"
                      ? "Variable amount"
                      : `${createdAmountMsat} msat`}
                  </div>
                ) : null} */}

                {/* {mode === "rgb_invoice" && selectedRgbContract ? (
                  <div className="text-sm">
                    Asset:{" "}
                    {selectedRgbContract.name ??
                      selectedRgbContract.ticker ??
                      "-"}
                  </div>
                ) : null} */}

                {/* <div className="flex gap-2">
                  <div className="text-sm">
                    {mode === "offer"
                      ? "Offer:"
                      : mode === "btc_onchain_address"
                      ? "Address:"
                      : "Invoice:"}
                  </div>
                  <code className="block break-all rounded-md text-sm">
                    {createdValue}
                  </code>
                </div> */}
              </div>

              <div className="space-y-2">
                {/* <Button
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
                  {copied
                    ? "Copied"
                    : mode === "btc_onchain_address"
                    ? "Copy Address"
                    : "Copy Invoice"}
                </Button> */}

                {/* <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    goBackRoot();
                  }}
                >
                  Back
                </Button> */}
              </div>
            </>
          ) : null}
        </div>
      </Content>
    </ContentWrapper>
  );
}
