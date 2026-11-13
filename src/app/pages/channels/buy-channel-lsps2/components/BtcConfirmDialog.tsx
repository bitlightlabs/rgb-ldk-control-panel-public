import { useEffect, useState } from "react";
import { useNodeLsps2QuoteMutation, useNodeLsps2InvoiceMutation } from "@/app/mutations/lsp";
import { useContextStore } from "@/app/stores/contextStore";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LspConnectionInfo } from "@/lib/sdk/types";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";
import Row from "@/app/components/Row";
import { formatNumber } from "@/lib/number";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { safeSubstring } from "@/lib/utils";
import { Copy } from "lucide-react";
import { Lsps2InvoiceResponse, Lsps2QuoteResponse } from "@/lib/sdk/generated-types";

interface IProps {
  lsp: LspConnectionInfo
  receiveAmountSats: string
  onClose: () => void
}

export default function BtcConfirmDialog(props: IProps) {
  const currentContext = useContextStore((s) => s.currentContext);
  const [btcQuoteData, setBtcQuoteData] = useState<Lsps2QuoteResponse | null>(null);
  
  const activeNodeId = currentContext?.node_id;
  const btcQuoteMutation = useNodeLsps2QuoteMutation();

  const queryBtcQuote = async () => {
    if(!activeNodeId) {
      return;
    }

    try {
      const res = await btcQuoteMutation.mutateAsync({
        nodeId: activeNodeId,
        request: {
          "lsp_node_id": props.lsp.pubkey,
          "amount_msat": (BigInt(props.receiveAmountSats) * 1000n).toString()
        }
      })
      setBtcQuoteData(res);
    } catch(e) {
      toast.error(errorToText(e))
    }
  }

  useEffect(() => {
    queryBtcQuote();
  }, [activeNodeId])

  return (
    <Dialog open onOpenChange={props.onClose}>
      <DialogContent className="w-[560px]">
        <DialogHeader>
          <DialogTitle>Confirm</DialogTitle>
        </DialogHeader>
        <BtcContent
          lsp={props.lsp}
          receiveAmountSats={props.receiveAmountSats}
          onClose={props.onClose}
          btcQuoteData={btcQuoteData}
        />
      </DialogContent>
    </Dialog>
  )
}

function BtcContent(props: {
  lsp: { address: string, pubkey: string },
  receiveAmountSats: string,
  onClose: () => void,
  btcQuoteData: Lsps2QuoteResponse | null
}) {
  const [step, setStep] = useState<'confirm' | 'qrcode'>('confirm');
  const [btcInvoiceData, setBtcInvoiceData] = useState<Lsps2InvoiceResponse | null>(null);
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;
  const lsps2InvoiceMutation = useNodeLsps2InvoiceMutation();


  const createInvoice = async () => {
    if(!activeNodeId) {
      return;
    }

    try {
      const fee = props.btcQuoteData?.fee_msat ?? '0';
      const data = await lsps2InvoiceMutation.mutateAsync({
        nodeId: activeNodeId,
        request: {
          "lsp_node_id": props.lsp.pubkey,
          "amount_msat": (BigInt(props.receiveAmountSats) * 1000n).toString(),
          "max_fee": fee,
          "description": "",
          "expiry_secs": 3600
        }
      })
      
      setBtcInvoiceData(data);
      setStep('qrcode');
    } catch(e) {
      toast.error(errorToText(e));
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(btcInvoiceData?.invoice ?? '');
      toast.success('Copied to clipboard');
    } catch (e) {}
  }

  if(step === 'confirm') {
    return (
      <>
        <div>
          <label className="leading-5 text-secondary-foreground text-xs">Amount</label>
          <div className="mt-2">
            <div>
              <span className="text-[34px] font-bold">
                {props.receiveAmountSats}
              </span>
              <span className="text-xl font-bold ml-2">
                sats
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
                {formatNumber(props.btcQuoteData?.fee_msat ?? '', 3)} sats
              </span>
            }
          />
          <Row
            className="text-secondary-foreground"
            label="Asset Type"
            value={<span className="font-medium text-foreground">BTC</span>}
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
            loading={lsps2InvoiceMutation.isPending}
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
          <QRCodeSVG value={btcInvoiceData?.invoice ?? ''} size={240} marginSize={2} />
        </div>
        <div className="mt-6 px-4 py-4 bg-background-3 rounded-3xl flex justify-between">
          <div className="text-base leading-5">
            {safeSubstring(btcInvoiceData?.invoice ?? '', 100)}
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
