import type { PaymentDetailsDto } from "@/lib/sdk/types";
import AssetAvatar from "../AssetAvatar";
import BtcAvatar from "./BtcAvatar";
import { formatAddress } from "@/lib/utils";
import CopyText from "../CopyText";

interface IProps {
  data: PaymentDetailsDto
}

function formatBalance(value: any) {
  return Number(value) / 1000 / 100_000_000;
}

export default function Btc(props: IProps) {
  const { data } = props;
  return (
    <div className="h-16 px-3 flex justify-between items-center">
      <div className="h-10 flex gap-3">
        <BtcAvatar type={data.direction} />
        <div>
          <div className="text-base font-medium leading-5">{data.direction === 'Inbound' ? 'Received' : 'Sending'}</div>
          <div className="text-sm text-secondary-foreground flex gap-2 items-center">
            <span>tx: {formatAddress(data.kind_details?.txid)}</span>
            <CopyText className="text-secondary-foreground" text={data.kind_details?.txid} />
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-base leading-5">
          <span className={data.direction === 'Inbound' ? 'text-success' : ''}>
            {data.direction === 'Inbound' ? '+' : '-'}{formatBalance(data.amount_msat)} BTC
          </span>
        </div>
        <div className="text-sm text-secondary-foreground">{data.status}</div>
      </div>
    </div>
  )
}
