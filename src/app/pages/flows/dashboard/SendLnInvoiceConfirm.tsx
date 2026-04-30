import CopyText from "@/app/components/CopyText";
import { Button } from "@/components/ui/button";
import { formatAddress } from "@/lib/utils";

interface IProps {
  // msat
  amount: string;
  invoiceRawDecodeQuery: any
  decodedDescription: string;
  onBack: () => void;
  onPay: () => void;
  disabled: boolean;
}
export default function SendLnInvoiceConfirm(props: IProps) {
  // const balanceMSat = useRef<string>('0');
  // const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const { amount, invoiceRawDecodeQuery, decodedDescription } = props;

  const destination = invoiceRawDecodeQuery?.data?.destination ?? '';

  const confirmPay = () => {
    props.onPay()
  }

  return (
    <div>
      <div className="text-xl text-center">You Are Sending</div>
      <div className="mt-9 h-10 leading-10 text-center">
        <span className="text-[34px] font-bold">{(BigInt(amount) / 1000n).toString()}</span>
        <span className="pl-2 text-[22px]">sats</span>
      </div>
      {/* <div className="mt-2 text-center text-sm text-secondary-foreground">
        <span className="pr-2">Available:</span>
        <WalletBtcBalance
          nodeId={activeNodeId ?? ''}
          onBalanceLoad={(s) => (BigInt(s) * 1000n).toString()}
        />
      </div> */}
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
          <label className="text-base text-secondary-foreground">Description</label>
          <div className="text-base">
            {decodedDescription}
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
