import Btc from "@/app/components/activities/Btc";
import Empty from "@/app/components/Empty";
import IconReceive from "@/app/icons/receive";
import { Button } from "@/components/ui/button";
import { PaymentDetailsDto } from "@/lib/sdk/types";
import { useNavigate } from "react-router-dom";

export function OnChainList(props: {loading: boolean, list: PaymentDetailsDto[]}) {
  const { loading, list } = props;
  const nav = useNavigate();

  if(list.length === 0 && !loading) {
    return (
      <div className="flex h-[532px] items-center justify-center">
        <Empty
          title={"No transaction yet"}
          subTitle={"You must recent incoming and outgoing payments will show up here."}
          action={
            <Button
              size="lg"
              variant="destructive"
              className="rounded-full"
              onClick={() => nav('/dashboard/receive')}
            >
              <IconReceive />
              <span>Receive Your First Payment</span>
            </Button>
          }
        />
      </div>
    )
  }

  return list.map((item) => {
    return (
      <Btc key={item.id} data={item} />
    )
  })
}
