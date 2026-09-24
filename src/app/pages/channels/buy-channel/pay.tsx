import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList } from "@/components/ui/tabs";
import { useNavigate, useSearchParams } from "react-router-dom";
import TabsCustomerTrigger from "./components/TabTrigger";
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Row from "@/app/components/Row";
import { Separator } from "@/components/ui/separator";
import { CopyTextInline } from "@/app/components/CopyText";
import { Button } from "@/components/ui/button";
import { useContextStore } from "@/app/stores/contextStore";
import { useBuyChannelDetailQuery } from "@/app/queries/lsp";
import type { LspOrdersResponse } from "@/lib/sdk/types";
import { toast } from "sonner";
import { formatNumber } from "@/lib/number";

export default function Pay() {
  const nav = useNavigate()
  const [search] = useSearchParams();
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;
  const [type, setType] = useState("Lightning (Bolt11)");
  const [orderData, setOrderData] = useState<LspOrdersResponse | null>(null);
  const timerRef = useRef(0);
  const [loading, setLoading] = useState(false);

  const orderId = search.get("orderId") || "";
  const orderDetailQuery = useBuyChannelDetailQuery(activeNodeId, orderId, {
    enabled: false
  });

  const checkPayment = async () => {
    if(!orderId || !activeNodeId) {
      return;
    }

    try {
      setLoading(true);
      clearTimeout(timerRef.current);
      const res = await orderDetailQuery.refetch();
      if(!res.data) {
        return;
      }

      const onChainState = res.data?.payment.onchain.state;
      const bolt11State = res.data?.payment.bolt11.state;
      const hasChannel = !!res.data?.channel
      if(onChainState === 'expect_payment' && bolt11State === 'expect_payment') {
        toast.error("Payment not detected.");
        setLoading(false);
        return;
      }

      // success or failed
      if(hasChannel || onChainState === 'refunded' || bolt11State === 'refunded') {
        next();
        setLoading(false);
        return;
      }

      // opening
      timerRef.current = setTimeout(() => {
        checkPayment()
      }, 10000) as unknown as number;
    } catch(e) {}
  }

  const initOrder = async () => {
    if(!orderId || !activeNodeId) {
      return;
    }

    try {
      const res = await orderDetailQuery.refetch();
      if(res.data) {
        setOrderData(res.data);
      }
    } catch(e) {}
  }

  useEffect(() => {
    initOrder()
  }, [orderId])

  const renderBolt11Qr = () => {
    const invoice = orderData?.payment.bolt11.invoice;
    if(!invoice) {
      return null;
    }

    return (
      <QRCodeSVG
        value={invoice}
        size={280}
        marginSize={2}
      />
    );
  }

  const renderAddressQr = () => {
    const address = orderData?.payment.onchain.address;
    if(!address) {
      return null;
    }

    return (
      <QRCodeSVG
        value={address}
        size={280}
        marginSize={2}
      />
    );
  }

  const next = () => {
    nav(`/dashboard/channels/buy-pay-result?orderId=${orderId}`, {replace: true});
  }

  return (
    <ContentWrapper className="mb-10">
      <ContentHeader title="Buy Channel" onBack={() => nav(-1)} />
      <Content>
        <Alert variant="destructive">
          <AlertDescription className="text-secondary-foreground">
            Current node balance is insufficient for this payment. Please pay via external wallet.
          </AlertDescription>
        </Alert>

        <div className="mt-8">
          <div className="h-5 flex gap-2 items-center justify-center">
            <Spinner className="text-secondary-foreground" />
            <span className="text-base text-secondary-foreground">Waiting for payment</span>
          </div>
          <div className="mt-3 leading-7 text-xl font-bold text-center">
            {orderData?.payment.onchain.order_total_sat} sats
          </div>
          <div className="mt-3 leading-5 text-base text-secondary-foreground text-center">
            = {formatNumber(orderData?.payment.onchain.order_total_sat ?? 0, 8)} BTC
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center">
          <Tabs value={type} onValueChange={setType}>
            <TabsList className="h-10 px-1 py-1 inline-flex bg-background gap-1 rounded-full">
              <TabsCustomerTrigger page="Lightning (Bolt11)" />
              <TabsCustomerTrigger page="On-chain" />
            </TabsList>
          </Tabs>
          <div className="mt-6 w-[280px] h-[280px] mx-auto overflow-hidden rounded-2xl">
            {
              type === "On-chain" ? renderAddressQr() : renderBolt11Qr()
            }
          </div>
        </div>

        <div className="mt-6 bg-background-3 rounded-3xl space-y-4 px-4 py-4">
          <Row
            className="text-secondary-foreground"
            label={type === "On-chain"
              ? "On-chain Address"
              : "Lightning Invoice (Bolt11)"
            }
            value={
              <span className="text-foreground font-medium">
                <CopyTextInline
                  text={type === "On-chain"
                    ? orderData?.payment.onchain.address || ""
                    : orderData?.payment.bolt11.invoice || ""
                  }
                />
              </span>
            }
          />
          <Separator className="bg-background-2" />
          <Row
            className="text-secondary-foreground"
            label="Order ID"
            value={
              <span className="text-foreground font-medium">
                <CopyTextInline
                  text={orderData?.order_id || ""}
                />
              </span>
            }
          />
        </div>
        <div className="mt-4 text-base text-secondary-foreground">
          The payment amount must not be less than the order amount; otherwise, the purchase will fail.
        </div>

        <div className="mt-8">
          <Button
            variant="destructive"
            size="lg"
            className="w-full rounded-full"
            loading={loading}
            disabled={loading}
            onClick={checkPayment}
          >Payment Completed</Button>
        </div>
      </Content>
    </ContentWrapper>
  )
}
