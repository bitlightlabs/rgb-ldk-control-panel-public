import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import Fee from "@/app/components/Fee";
import WalletBtcBalance from "@/app/components/WalletBtcBalance";
import { useNodeWalletSendAllMutation, useNodeWalletSendMutation } from "@/app/mutations/wallet";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { ComplexInput, Input } from "@/components/ui/input";
import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";
import { BITCOIN_DUST } from "@/app/config/constant";


export default function BtcOnchain() {
  const [feeRate, setFeeRate] = useState("0");
  const nav = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);
  const [search] = useSearchParams();
  const btcBalance = useRef("0");
  const [sendAmountSats, setSendAmountSats] = useState("");
  const walletSendMutation = useNodeWalletSendMutation();
  const walletSendAllMutation = useNodeWalletSendAllMutation();

  const payload = search.get('payload') ?? "";
  const activeNodeId = currentContext?.node_id;

  const switchAll = () => {
    setSendAmountSats(btcBalance.current);
  }

  const sendAll = async () => {
    if(!activeNodeId || !payload) {
      return;
    }

    try {
      const res = await walletSendAllMutation.mutateAsync({
        nodeId: activeNodeId,
        request: {
          address: payload,
          retain_reserves: true,
          fee_rate_sats_per_vb: Number(feeRate),
        }
      });

      nav('/dashboard/send/success?payment_id='
        + encodeURIComponent(res.txid)
        + '&amount=' + encodeURIComponent(sendAmountSats)
        + '&symbol=sats'
      );

    } catch (e) {
      toast.error(errorToText(e));
    }
  }

  const sendSome = async () => {
    if(!activeNodeId || !payload) {
      return;
    }

    try {
      const res = await walletSendMutation.mutateAsync({
        nodeId: activeNodeId,
        request: {
          address: payload,
          amount_sats: sendAmountSats,
          fee_rate_sats_per_vb: Number(feeRate),
        }
      });

      nav('/dashboard/send/success?payment_id='
        + encodeURIComponent(res.txid)
        + '&amount=' + encodeURIComponent(sendAmountSats)
        + '&symbol=sats'
      );

    } catch (e) {
      toast.error(errorToText(e));
    }
  }

  const sendBtc = async () => {
    if(!sendAmountSats) {
      return;
    }

    if(btcBalance.current === '0') {
      return;
    }

    if(BigInt(sendAmountSats) > BigInt(btcBalance.current)) {
      toast.error("Insufficient balance");
      return;
    }

    // send all
    if(BigInt(btcBalance.current) - BigInt(sendAmountSats) <= BITCOIN_DUST) {
      sendAll();
      return;
    }

    sendSome();
  }

  return (
    <ContentWrapper>
      <ContentHeader
        title="BTC Payment"
        onBack={() => nav(-1)}
      />
      <Content>
        <div className='flex flex-col gap-8'>
          <Field>
            <FieldLabel>To</FieldLabel>
            <Input
              type="text"
              value={payload}
            />
          </Field>
          <Field>
            <FieldLabel>Amount</FieldLabel>
            <ComplexInput
              className="bg-background-4"
              inputMode="numeric"
              slot={
                <div>
                  <span className="mr-3">sats</span>
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-7 rounded-full px-2.5 py-0 text-xs"
                    onClick={switchAll}
                  >ALL</Button>
                </div>
              }
              bottom={
                <span className="text-xs text-secondary-foreground">
                  <span>Available: </span>
                  <WalletBtcBalance
                    nodeId={activeNodeId ?? ""}
                    onBalanceLoad={(v) => {
                      btcBalance.current = v
                    }}
                  />
                </span>
              }
              placeholder="0"
              value={sendAmountSats}
              onChange={(e) => setSendAmountSats(e.currentTarget.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Fee</FieldLabel>
            <div>
              <Fee onFeeChange={setFeeRate} />
            </div>
          </Field>
          <div className="flex gap-3">
            <Button
              type="button"
              size="lg"
              variant="destructive"
              className="bg-background-3 w-[120px] shrink-0 rounded-full"
              onClick={() => nav(-1)}
            >Back</Button>
            <Button
              type="button"
              size="lg"
              variant="white"
              className="flex-1 rounded-full"
              disabled={feeRate === '0' || sendAmountSats === ''}
              loading={walletSendMutation.isPending || walletSendAllMutation.isPending}
              onClick={sendBtc}
            >Confirm Payment</Button>
          </div>
        </div>
      </Content>
    </ContentWrapper>
  )
}
