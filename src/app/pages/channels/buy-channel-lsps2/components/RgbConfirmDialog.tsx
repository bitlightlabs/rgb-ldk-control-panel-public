import { useEffect, useState } from "react";
import { useNodeLsps2RgbInvoiceMutation, useNodeLsps2RgbQuoteMutation } from "@/app/mutations/lsp";
import { useContextStore } from "@/app/stores/contextStore";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LspConnectionInfo, LspPricingAsset } from "@/lib/sdk/types";
import type { Lsps2RgbQuoteResponse } from "@/lib/sdk/generated-types";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";
import Row from "@/app/components/Row";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { safeSubstring } from "@/lib/utils";
import { Copy } from "lucide-react";
import type { Lsps2InvoiceResponse } from "@/lib/sdk/generated-types";
import AssetAvatar from "@/app/components/AssetAvatar";
import { CopyTextInline } from "@/app/components/CopyText";

interface IProps {
  lsp: LspConnectionInfo
  asset: LspPricingAsset
  receiveAmountRgb: string
  channelAmountSats: string
  onClose: () => void
}

export default function RgbConfirmDialog(props: IProps) {
  return (
    <Dialog open onOpenChange={props.onClose}>
      <DialogContent className="w-[560px]">
        <DialogHeader>
          <DialogTitle>Confirm</DialogTitle>
        </DialogHeader>
        <RgbContent
          lsp={props.lsp}
          asset={props.asset}
          receiveAmountRgb={props.receiveAmountRgb}
          channelAmountSats={props.channelAmountSats}
          onClose={props.onClose}
        />
      </DialogContent>
    </Dialog>
  )
}

function RgbContent(props: {
  lsp: LspConnectionInfo,
  asset: LspPricingAsset,
  receiveAmountRgb: string,
  channelAmountSats: string,
  onClose: () => void,
}) {
  const [step, setStep] = useState<'confirm' | 'qrcode'>('confirm');
  const [rgbInvoiceData, setRgbInvoiceData] = useState<Lsps2InvoiceResponse | null>(null);
  const currentContext = useContextStore((s) => s.currentContext);
  const [lsps2RgbQuoteData, setLsps2RgbQuoteData] = useState<Lsps2RgbQuoteResponse | null>(null);

  const activeNodeId = currentContext?.node_id;
  const rgbQuote = useNodeLsps2RgbQuoteMutation();
  const rgbInvoiceMutation = useNodeLsps2RgbInvoiceMutation();

  const createInvoice = async () => {
    if(!activeNodeId) {
      return;
    }

    try {
      const precision = props.asset.precision ?? 0;
      const assetAmount = BigInt(props.receiveAmountRgb) * BigInt(10 ** precision);
      const fee = lsps2RgbQuoteData?.estimated_fee.fee_sat ?? '0';
      const data = await rgbInvoiceMutation.mutateAsync({
        nodeId: activeNodeId,
        request: {
          lsp_node_id: props.lsp.pubkey,
          contract_id: props.asset.asset_id,
          asset_amount: assetAmount.toString(),
          lsp_asset_balance: assetAmount.toString(),
          lsp_balance_sat: props.channelAmountSats,
          
          max_fee_sat: fee,
          description: "",
          expiry_secs: 3600
        }
      });

      setRgbInvoiceData(data);
      setStep('qrcode');
    } catch(e) {
      toast.error(errorToText(e));
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(rgbInvoiceData?.invoice ?? '');
      toast.success('Copied to clipboard');
    } catch (e) {}
  }

  const fetchQuote = async () => {
    if(!activeNodeId) {
      return;
    }
    try {
      const precision = props.asset.precision ?? 0;
      const assetAmount = BigInt(props.receiveAmountRgb) * BigInt(10 ** precision);

      const res = await rgbQuote.mutateAsync({
        nodeId: activeNodeId,
        request: {
          lsp_node_id: props.lsp.pubkey,
          contract_id: props.asset.asset_id,
          asset_amount: assetAmount.toString(),
          lsp_asset_balance: assetAmount.toString(),
          lsp_balance_sat: props.channelAmountSats,
          btc_carrier_amount_msat: "354000"
        }
      });
      setLsps2RgbQuoteData(res);
    } catch(e) {
      toast.error(errorToText(e))
    }
  }

  useEffect(() => {
    fetchQuote();
  }, [activeNodeId]);

  if(step === 'confirm') {
    return (
      <>
        <div>
          <label className="leading-5 text-secondary-foreground text-xs">Amount</label>
          <div className="mt-2">
            <div>
              <span className="text-[34px] font-bold">
                {props.receiveAmountRgb}
              </span>
              <span className="text-xl font-bold ml-2">
                {props.asset.ticker}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-background-3 rounded-3xl space-y-4 px-4 py-4">
          <Row
            className="text-secondary-foreground"
            label="LSP (Provider)"
            value={<span className="font-medium text-foreground">{props.lsp.address}</span>}
          />
          <Row
            className="text-secondary-foreground"
            label="LSP Fee"
            value={
              <span className="font-medium text-foreground">
                {lsps2RgbQuoteData?.estimated_fee.fee_sat} sats
              </span>
            }
          />
          <Row
            className="text-secondary-foreground"
            label="Asset Type"
            value={<span className="font-medium text-foreground">BTC/RGB</span>}
          />
          <Row
            className="h-auto text-secondary-foreground"
            label="RGB Asset"
            value={
              <div>
                <div className="h-5 flex items-center justify-end gap-2 text-base text-foreground">
                  <AssetAvatar className="w-5 h-5" name={props.asset.ticker} />
                  <span className="font-medium">{props.asset.ticker}</span>
                </div>
                <div className="mt-1">
                  <CopyTextInline text={props.asset.asset_id} />
                </div>
              </div>
            }
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="destructive"
            size="lg"
            className="w-full rounded-full"
            onClick={props.onClose}
          >Back</Button>

          <Button
            variant="white"
            size="lg"
            className="w-full rounded-full"
            loading={rgbInvoiceMutation.isPending}
            disabled={rgbQuote.isError}
            onClick={createInvoice}
          >Create Invoice</Button>
        </div>
      </>
    )
  }

  // qucode
  return (
    <>
      <div>
        <div className="w-[240px] h-[240px] mx-auto overflow-hidden rounded-2xl">
          <QRCodeSVG value={rgbInvoiceData?.invoice ?? ''} size={240} marginSize={2} />
        </div>
        <div className="mt-6 px-4 py-4 bg-background-3 rounded-3xl flex justify-between">
          <div className="text-base leading-5">
            {safeSubstring(rgbInvoiceData?.invoice ?? '', 100)}
          </div>
          <div className="w-[126px] shrink-0 flex justify-end items-center">
            <Button variant="destructive" className="h-11 rounded-full w-[106px]" onClick={copy}>
              <Copy />
              <span>Copy</span>
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="white"
          size="lg"
          className="rounded-full flex-1"
          onClick={props.onClose}
        >Done</Button>
      </DialogFooter>
    </>
  )
}
