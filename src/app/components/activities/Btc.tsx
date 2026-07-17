import type { PaymentDetailsDto } from "@/lib/sdk/types";
import BtcAvatar from "./BtcAvatar";
import { CopyTextInline } from "../CopyText";

interface IProps {
  data: PaymentDetailsDto
}

function formatBalance(value: any) {
  return Number(value) / 1000 / 100_000_000;
}

export default function Btc(props: IProps) {
  const { data } = props;
  return (
    <div className="h-16 px-3 flex justify-between items-center hover:bg-background-3 rounded-2xl">
      <div className="h-10 flex gap-3">
        <BtcAvatar type={data.direction} />
        <div>
          <div className="text-base font-medium leading-5">{data.direction === 'Inbound' ? 'Received' : 'Sending'}</div>
          <div className="mt-1 text-sm text-secondary-foreground flex gap-1 items-center">
            <span>tx:</span>
            <CopyTextInline text={data.kind_details?.txid} />
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-base leading-5">
          <span className={data.direction === 'Inbound' ? 'text-success' : ''}>
            {data.direction === 'Inbound' ? '+' : '-'}{formatBalance(data.amount_msat)} BTC
          </span>
        </div>
        <div className="mt-1 text-sm text-secondary-foreground">{data.status}</div>
      </div>
    </div>
  )
}
