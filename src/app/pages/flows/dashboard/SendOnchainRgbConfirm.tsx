import CopyText from "@/app/components/CopyText";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatAddress } from "@/lib/utils";

interface IProps {
  amount: string;
  symbol: string;
  onchainInvoiceDecodeQuery: any
  decodedDescription: string;
  onBack: () => void;
  onPay: () => void;
  disabled: boolean;
  feeRate: string;
  changeFeeRage: (feeRate: string) => void;
}
export default function SendOnchainRGBConfirm(props: IProps) {
  const { amount, symbol, onchainInvoiceDecodeQuery, feeRate, changeFeeRage } = props;

  console.log(33, onchainInvoiceDecodeQuery?.data)
  const contractId = onchainInvoiceDecodeQuery?.data?.contract_id ?? '';

  return (
    <div>
      <div className="text-xl text-center">You Are Sending</div>
      <div className="mt-9 h-10 leading-10 text-center">
        <span className="text-[34px] font-bold">{amount}</span>
        <span className="pl-2 text-[22px]">{symbol}</span>
      </div>
      <div className="mt-2 text-center text-sm text-secondary-foreground">Available: -</div>
      <div className="mt-10 bg-background-3 rounded-3xl p-4">
        <div className="h-5 flex justify-between">
          <label className="text-base text-secondary-foreground">Contract ID</label>
          <div className="text-base flex gap-1 items-center">
            <span>{formatAddress(contractId)}</span>
            <CopyText text={contractId} className="text-secondary-foreground" />
          </div>
        </div>
      </div>
      <Field className="mt-10">
        <FieldLabel>
          Fee Rate (sats/vB)
        </FieldLabel>
        <Input
          value={feeRate}
          onChange={(e) => changeFeeRage(e.currentTarget.value)}
          placeholder="20"
          inputMode="numeric"
          className="h-13 rounded-2xl text-[22px] font-bold"
        />
      </Field>

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
          onClick={props.onPay}
        >Confirm Payment</Button>
      </div>
    </div>
  )
}
