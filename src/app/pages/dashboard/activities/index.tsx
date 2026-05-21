import { useQuery } from "@tanstack/react-query";
import { nodePaymentsList } from "@/lib/commands";
import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { useNavigate } from "react-router-dom";
import Btc from "@/app/components/activities/Btc";
import { Button } from "@/components/ui/button";
import IconReceive from "@/app/icons/receive";
import Empty from "@/app/components/Empty";
import { useContextStore } from "@/app/stores/contextStore";

export default function ActivitiesPage() {
  const nav = useNavigate()
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  const paymentsQuery = useQuery({
    queryKey: ["node_payments_list", activeNodeId],
    queryFn: () => nodePaymentsList(activeNodeId!),
    enabled: !!activeNodeId,
    refetchInterval: 5_000,
  });

  if (!activeNodeId || paymentsQuery.isPending) {
    return null
  }

  const list = paymentsQuery.data ?? [];

  return (
    <ContentWrapper className="w-full">
      <ContentHeader title="Activities" onBack={() => nav('/dashboard')} />
      <Content className="px-2">
        {
          list.length === 0 ? (
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
          ) : list.map((item) => {
            return (
              <Btc data={item} />
            )
          })
        }
      </Content>
    </ContentWrapper>
  );
}
