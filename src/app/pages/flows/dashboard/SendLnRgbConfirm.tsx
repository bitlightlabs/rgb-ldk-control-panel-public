import CopyText from "@/app/components/CopyText";
import { Button } from "@/components/ui/button";
import type { RgbContractsResponse } from "@/lib/sdk/types";
import { formatAddress } from "@/lib/utils";

interface IProps {
  amount: string;
  symbol: string;
  rgbContracts: RgbContractsResponse | undefined
  rgbInvoiceDecodeQuery: any
  decodedDescription: string;
  onBack: () => void;
  onPay: () => void;
  disabled: boolean;
}
export default function SendLnRGBConfirm(props: IProps) {
  const { amount, symbol, rgbInvoiceDecodeQuery, decodedDescription } = props;

  const destination = rgbInvoiceDecodeQuery?.data?.destination ?? '';
  const carrierAmountMsat = rgbInvoiceDecodeQuery?.data?.carrier_amount_msat ?? '';
  const contractId = rgbInvoiceDecodeQuery?.data?.contract_id ?? '';

  const confirmPay = () => {
    props.onPay()
  }

  return (
    <div>
      <div className="text-xl text-center">You Are Sending</div>
      <div className="mt-9 h-10 leading-10 text-center">
        <span className="text-[34px] font-bold">{amount}</span>
        <span className="pl-2 text-[22px]">{symbol}</span>
      </div>
      <div className="mt-10 bg-background-3 rounded-3xl p-4">
        <div className="h-5 flex justify-between">
          <label className="text-base text-secondary-foreground">To</label>
          <div className="text-base flex gap-1 items-center">
            <span>{formatAddress(destination)}</span>
            <CopyText text={destination} className="text-secondary-foreground" />
          </div>
        </div>
        <div className="bg-background-3 h-[1px] my-4"></div>
        <div className="flex justify-between">
          <label className="text-base text-secondary-foreground">BTC Carrier</label>
          <div className="text-base text-right">
            <div className="text-base">{carrierAmountMsat} msats</div>
            {/* <div className="text-sm text-secondary-foreground font-normal">vailable: - BTC</div> */}
          </div>
        </div>
        <div className="mt-4 h-5 flex justify-between">
          <label className="text-base text-secondary-foreground">Contract ID</label>
          <div className="text-base flex gap-1 items-center">
            <span>{formatAddress(contractId)}</span>
            <CopyText text={contractId} className="text-secondary-foreground" />
          </div>
        </div>
      </div>

      <div className="mt-10 flex gap-3">
        <Button
          size="lg"
          variant="destructive"
          className="bg-background-3 w-[120px] shrink-0 rounded-full"
          onClick={props.onBack}
        >Back</Button>
        <Button
          size="lg"
          variant="white"
          className="flex-1 rounded-full"
          disabled={props.disabled}
          onClick={confirmPay}
        >Confirm Payment</Button>
      </div>
    </div>
  )
}
