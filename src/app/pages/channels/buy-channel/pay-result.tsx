import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { Spinner } from "@/components/ui/spinner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import IconSuccess from "@/app/icons/success";
import { useBuyChannelDetailQuery } from "@/app/queries/lsp";
import { useContextStore } from "@/app/stores/contextStore";
import type { LspOrdersResponse } from "@/lib/sdk/types";
import IconError from "@/app/icons/IconError";

const waitingPaymentInfo = (
  <>
    <div className="mt-1.5 w-[54px] h-[54px] rounded-full flex items-center justify-center" style={{ background: "rgba(0, 145, 255, 0.12)" }}>
      <Spinner className="size-6 text-[#0091FF]" />
    </div>
    <div className="mt-6 leading-[22px] font-medium text-lg">Querying Order Status</div>
    <div className="mt-2 text-base text-secondary-foreground">Opening your Lightning channel...</div>
  </>
)

const paidInfo = (
  <>
    <div className="mt-1.5 w-[54px] h-[54px] rounded-full flex items-center justify-center" style={{ background: "rgba(0, 145, 255, 0.12)" }}>
      <Spinner className="size-6 text-[#0091FF]" />
    </div>
    <div className="mt-6 leading-[22px] font-medium text-lg">Payment Successful</div>
    <div className="mt-2 text-base text-secondary-foreground">Opening your Lightning channel...</div>
  </>
)

const successInfo = (
  <>
    <div className="mt-1.5 w-[54px] h-[54px] flex items-center justify-center">
      <IconSuccess style={{width: '54px', height: '54px'}} />
    </div>
    <div className="mt-6 leading-[22px] font-medium text-lg">Channel Opened</div>
    <div className="mt-2 text-base text-secondary-foreground">Your Lightning channel is ready to use.</div>
  </>
)

const failInfo = (
  <>
    <div className="mt-1.5 w-[54px] h-[54px] flex items-center justify-center">
      <IconError style={{width: '54px', height: '54px'}} />
    </div>
    <div className="mt-6 leading-[22px] font-medium text-lg text-center">Channel Opening Failed</div>
    <div className="mt-2 text-base text-secondary-foreground w-[500px] text-center">
      Something went wrong while opening the channel.<br />
      The payment has been refunded to your address.
    </div>
  </>
)

export default function PayResult() {
  const nav = useNavigate()
  const [search] = useSearchParams();
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;
  const [orderData, setOrderData] = useState<LspOrdersResponse | null>(null);
  const timerRef = useRef(0);
  const [loading, setLoading] = useState(true);

  const orderId = search.get("orderId") || "";
  const orderDetailQuery = useBuyChannelDetailQuery(activeNodeId, orderId, {
    enabled: false
  });

  const queryData = async () => {
    if(!orderId || !activeNodeId) {
      return;
    }

    try {
      clearTimeout(timerRef.current);
      const res = await orderDetailQuery.refetch();
      if(res.data) {
        setOrderData(res.data);
      }

      const onChainState = res.data?.payment.onchain.state;
      const bolt11State = res.data?.payment.bolt11.state;
      const hasChannel = !!res.data?.channel
      if(hasChannel || onChainState === 'refunded' || bolt11State === 'refunded') {
        return;
      } else {
        timerRef.current = setTimeout(() => {
          clearTimeout(timerRef.current);
          queryData()
        }, 10000) as unknown as number;
      }
    } catch(e) {} finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queryData()
  }, [orderId])

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
    }
  }, [])

  const renderStatus = () => {
    const channel = orderData?.channel;
    const onChainState = orderData?.payment.onchain.state;
    const bolt11State = orderData?.payment.bolt11.state;

    if(loading) {
      return (
        <div className="flex items-center justify-center py-4">
          <Spinner className="w-16 h-16" />
        </div>
      );
    }

    if(onChainState === 'expect_payment' && bolt11State === 'expect_payment') {
      return (
        <>
          <div className="flex flex-col items-center justify-center">
            {waitingPaymentInfo}
          </div>

          <div className="flex gap-3">
            <Button
              variant="destructive"
              size="lg"
              className="w-full rounded-full"
              onClick={() => nav(-1)}
            >Back</Button>
            <Button
              variant="white"
              size="lg"
              className="w-full rounded-full"
              disabled
            >Opening Channel...</Button>
          </div>
        </>
      );
    }

    if(onChainState === 'refunded' || bolt11State === 'refunded') {
      return (
        <>
          <div className="flex flex-col items-center justify-center">
            {failInfo}
          </div>
          <div className="flex gap-3">
            <Button
              variant="destructive"
              size="lg"
              className="w-full rounded-full"
              onClick={() => nav(-1)}
            >Back</Button>
          </div>
        </>
      );
    }

    if(channel) {
      return (
        <>
          <div className="flex flex-col items-center justify-center">
            {successInfo}
          </div>
          <div className="flex gap-3">
            <Button
              variant="white"
              size="lg"
              className="w-full rounded-full"
              onClick={() => nav(-1)}
            >View Channel</Button>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="flex flex-col items-center justify-center">
          {paidInfo}
        </div>
        <div className="flex gap-3">
          <Button
            variant="destructive"
            size="lg"
            className="w-full rounded-full"
            onClick={() => nav(-1)}
          >Back</Button>
          <Button
            variant="white"
            size="lg"
            className="w-full rounded-full"
            disabled
          >Opening Channel...</Button>
        </div>
      </>
    );
  }

  return (
    <ContentWrapper className="mb-10">
      <ContentHeader title="Buy Channel" onBack={() => nav(-1)} />
      <Content className="space-y-8">
        {renderStatus()}
      </Content>
    </ContentWrapper>
  )
}
