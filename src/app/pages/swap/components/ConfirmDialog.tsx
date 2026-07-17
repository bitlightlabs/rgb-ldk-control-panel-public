import AssetAvatar from "@/app/components/AssetAvatar";
import Step from "@/app/components/Step";
import IconArrowRight from "@/app/icons/arrowright";
import { useSwapOffersMutation } from "@/app/mutations/swap";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { Separator } from "@/components/ui/separator";
import { errorToText } from "@/lib/errorToText";
import { parseNumber } from "@/lib/number";
import type { ChannelDetailsExtendedDto, RgbContractDto } from "@/lib/sdk/types";
import { safeSubstring } from "@/lib/utils";
import { Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";
import { Store } from '@tauri-apps/plugin-store'
import { LOCAL_SWAP_STRING } from "@/app/config/constant";

interface IProps {
  payload: {
    btcCarrierSats: string;
    channel: ChannelDetailsExtendedDto | null;
    fromAsset: RgbContractDto | null;
    fromAmount: string;
    toAsset: RgbContractDto | null;
    toAmount: string;
  }
  onClose: () => void;
}
export default function ConfirmDialog(props: IProps) {
  const { payload } = props;
  const [step, setStep] = useState<'init' | 'processing' | 'qr'>('init');
  const [posting, setPosting] = useState(false);
  const [offerResult, setOfferResult] = useState<any>(null);
  const { currentContext } = useContextStore()

  const swapOffersMutation = useSwapOffersMutation()

  const renderStep = () => {
    if(step === 'init') {
      return (
        <Init
          loading={posting}
          payload={payload}
          onNext={swap}
          onCancel={props.onClose}
        />
      )
    }

    if(step === 'qr') {
      return (
        <Qr
          result={offerResult}
          onCancel={props.onClose}
        />
      )
    }

    // return (
    //   <Processing
    //     onCancel={props.onClose}
    //   />
    // )
    return null
  }

  const swap = async () => {
    const channel = payload.channel;
    if(!channel) {
      return
    }
    if(!payload.fromAsset || !payload.toAsset) {
      return
    }

    if(!currentContext) {
      return
    }

    const makerGivesRgb = payload.fromAsset.name !== 'BTC';
    const precision = makerGivesRgb ? payload.fromAsset.precision : payload.toAsset.precision;
    const contract = payload.fromAsset.name !== 'BTC' ? payload.fromAsset : payload.toAsset;
    if(!contract.contract_id) {
      return
    }
    const assetAmount = makerGivesRgb
      ? parseNumber(payload.fromAmount, (precision || 0))
      : parseNumber(payload.toAmount, (precision || 0))

    const btcAmountMsat = makerGivesRgb
      ? parseNumber(payload.toAmount, 3)
      : parseNumber(payload.fromAmount, 3)

    const btcCarrierMsat = (BigInt(payload.btcCarrierSats) * 1000n).toString()

    const data = {
      "counterparty_node_id": channel.counterparty_node_id,
      "channel_scid": channel.short_channel_id,
      "contract_id": contract.contract_id,
      "asset_amount": assetAmount,
      "btc_amount_msat": btcAmountMsat,
      "btc_carrier_amount_msat": btcCarrierMsat,
      "maker_gives_rgb": makerGivesRgb,
      "expiry_secs": 3600
    }
    console.log('offersData', data)

    try {
      setPosting(true)

      const store = await Store.load(LOCAL_SWAP_STRING)

      const json = await swapOffersMutation.mutateAsync({
        nodeId: currentContext.node_id,
        request: data
      });

      // Swap string only exists at creation time and cannot be obtained elsewhere
      // We store it locally so that the user can retrieve it later if needed
      await store.set(json.payment_hash, json.swap_string)
      await store.save()

      setOfferResult(json);
      setStep('qr')
    } catch(e) {
      toast.error(errorToText(e))
    } finally {
      setPosting(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={props.onClose}
    >
      <DialogContent className="w-[560px]">
        <DialogHeader>
          <DialogTitle>Swap</DialogTitle>
        </DialogHeader>
        <div className="relative flex h-[85px]">
          <IconArrowRight className="absolute top-[calc(50%-10px)] left-[calc(50%-10px)]" />
          <div className="flex-1 flex flex-col items-center">
            <AssetAvatar className="w-12 h-12" name={payload.fromAsset?.name ?? ''} />
            <div className="mt-3 text-[20px] font-medium">
              <span>{payload.fromAmount}</span>
              <span> {payload.fromAsset?.name === 'BTC' ? 'sats' : (payload.fromAsset?.name)}</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <AssetAvatar className="w-12 h-12" name={payload.toAsset?.name ?? ''} />
            <div className="mt-3 text-[20px] font-medium">
              <span>{payload.toAmount}</span>
              <span> {payload.toAsset?.name === 'BTC' ? 'sats' : (payload.toAsset?.name)}</span>
            </div>
          </div>
        </div>

        {renderStep()}
      </DialogContent>
    </Dialog>
  )
}

function Init(props: {
  loading: boolean,
  onNext: () => void,
  onCancel: () => void,
  payload: IProps['payload']
}) {
  return (
    <>
      <div>
        <div className="bg-background-3 rounded-3xl px-4 py-4 space-y-4">
          <Row label="BTC Carrier" value={props.payload.btcCarrierSats + ' sats'} />
          {/* <Row label="Market Maker" value="100,000 sats" />
          <Separator />
          <Row label="Market Rate" value="sat = 0.00000626 USDT" /> */}
        </div>
        <div className="mt-4 text-base text-secondary-foreground">
          The received assets will be deposited into your Lightning channel.
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full flex-1"
          disabled={props.loading}
          onClick={props.onCancel}
        >Back</Button>
        <Button
          variant="white"
          size="lg"
          className="rounded-full flex-1"
          loading={props.loading}
          onClick={props.onNext}
        >Confirm</Button>
      </DialogFooter>
    </>
  )
}

function Processing(props: {onCancel: () => void}) {
  return (
    <>
      <div>
        <div className="px-4 py-4 bg-background-3 rounded-3xl">
          <Step
            currentStep={3}
            currentStatus="loading"
            list={[
              {title: 'Creating quote', description: ''},
              {title: 'Sending BTC...', description: 'asdfasdfasdf'},
              {title: 'Swap node validation in progress…', description: ''},
              {title: 'Waiting for USDT settlement…', description: ''},
              {title: 'Completed', description: ''},
            ]}
          />
        </div>
        <div className="mt-4 text-base text-secondary-foreground">
          Swaps are settled via RGB Lightning. Received assets will
          be credited to your active Lightning channel after confirmation.
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full flex-1"
          onClick={props.onCancel}
        >Back</Button>
        <Button
          variant="white"
          size="lg"
          className="rounded-full flex-1"
          onClick={() => {}}
        >Confirm</Button>
      </DialogFooter>
    </>
  )
}

function Qr(props: {result: {swap_string: string}, onCancel: () => void}) {
  const { result } = props;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.swap_string);
      toast.success('Copied to clipboard')
    } catch (e) {}
  }

  return (
    <>
      <div>
        <div className="w-[240px] h-[240px] mx-auto overflow-hidden rounded-2xl">
          <QRCodeSVG value={result.swap_string} size={240} marginSize={2} />
        </div>
        <div className="mt-6 px-4 py-4 bg-background-3 rounded-3xl flex justify-between">
          <div className="text-base leading-5">
            {safeSubstring(result.swap_string, 100)}
          </div>
          <div className="w-[126px] shrink-0 flex justify-end items-center">
            <Button variant="destructive" className="h-11 rounded-full w-[106px]" onClick={copy}>
              <Copy />
              <span>Copy</span>
            </Button>
          </div>
        </div>
        <div className="mt-4 text-base text-secondary-foreground leading-5">
          Share this invoice and ask the recipient to click 'Accept Swap' as soon as possible.
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="white"
          size="lg"
          className="rounded-full flex-1"
          onClick={props.onCancel}
        >Done</Button>
      </DialogFooter>
    </>
  )
}

function Row(props: {label: string, value: string}) {
  return (
    <div className="flex justify-between text-base">
      <label className="text-secondary-foreground">{props.label}</label>
      <span className="font-medium">{props.value}</span>
    </div>
  )
}
