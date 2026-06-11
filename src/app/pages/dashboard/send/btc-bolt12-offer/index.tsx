import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import CopyText from "@/app/components/CopyText";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { nodeBolt12OfferDecode, nodeBolt12OfferSend } from "@/lib/commands";
import { formatAddress } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";


export default function SendBolt12OfferConfirm() {
  const nav = useNavigate()
  const currentContext = useContextStore((s) => s.currentContext);
  const [search] = useSearchParams()
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [offerAmountSats, setOfferAmountSats] = useState("11");

  const payload = search.get('payload') ?? "";
  const activeNodeId = currentContext?.node_id;

  const next = () => {
    setStep('confirm');
  }

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) throw new Error("No active node selected");

      // bolt12 offer
      return nodeBolt12OfferSend(activeNodeId, {
        offer: payload,
        amount_msat: (BigInt(offerAmountSats) * BigInt(1000)).toString(),
        quantity: null,
        payer_note: offerDecodeQuery.data?.description ?? null,
      });
    },
    onSuccess: (resp) => {
      nav('/dashboard/send/success?payment_id='
        + encodeURIComponent(resp.payment_id)
        + '&amount=' + encodeURIComponent(offerAmountSats)
        + '&symbol=sats'
      )
    },
  });

  const offerDecodeQuery = useQuery({
    queryKey: ["bolt12_offer_decode", activeNodeId, payload],
    queryFn: async () =>
      nodeBolt12OfferDecode(activeNodeId!, { offer: payload }),
    enabled: !!activeNodeId && payload.trim() !== "",
    retry: 1,
    retryDelay: 300,
  });

  const offerDecodeQueryData = offerDecodeQuery.data;


  if(step === 'form') {
    return (
      <ContentWrapper>
        <ContentHeader
          title="BTC Payment"
          onBack={() => nav(-1)}
        />
        <Content>
          <div className="bg-background-3 rounded-3xl p-4">
            <div className="h-5 flex justify-between">
              <label className="text-base text-secondary-foreground">Offer</label>
              <div className="text-base flex gap-1.5 items-center">
                <span>{formatAddress(payload)}</span>
                <CopyText text={payload} className="text-secondary-foreground" />
              </div>
            </div>
            <div className="mt-4 h-5 flex justify-between">
              <label className="text-base text-secondary-foreground">Description</label>
              <div className="text-base flex gap-1 items-center">
                {offerDecodeQueryData?.description ?? ''}
              </div>
            </div>
          </div>

          <Field className="mt-8">
            <FieldLabel>
              Amount To Send
            </FieldLabel>
            <Input
              value={offerAmountSats}
              onChange={(e) => setOfferAmountSats(e.target.value)}
              placeholder="20"
              inputMode="numeric"
              slot={<span className="text-base">sats</span>}
              // bottom={
              //   <span className="text-sm font-normal">Available: 10 BTC</span>
              // }
            />
          </Field>

          <div className="mt-8 flex gap-3">
            <Button
              size="lg"
              variant="destructive"
              className="bg-background-3 w-[120px] shrink-0 rounded-full"
              onClick={() => nav(-1)}
            >Back</Button>
            <Button
              size="lg"
              variant="white"
              className="flex-1 rounded-full"
              disabled={!offerAmountSats}
              onClick={next}
            >Review</Button>
          </div>
        </Content>
      </ContentWrapper>
    )
  }

  return (
    <ContentWrapper>
      <ContentHeader
        title="BTC Payment"
        onBack={() => nav(-1)}
      />
      <Content className="space-y-8">
        <div>
          <div className="text-xl text-center">You Are Sending</div>
          <div className="mt-8 h-10 leading-10 text-center">
            <span className="text-[34px] font-bold">{offerAmountSats}</span>
            <span className="pl-2 text-[22px]">sats</span>
          </div>
          {/* <div className="mt-2 text-center text-sm text-secondary-foreground">Available: -</div> */}
        </div>

        <div className="bg-background-3 rounded-3xl p-4">
          <div className="h-5 flex justify-between">
            <label className="text-base text-secondary-foreground">To</label>
            <div className="text-base flex gap-1 items-center">
              <span>{formatAddress(offerDecodeQueryData?.description ?? '')}</span>
              <CopyText text={""} className="text-secondary-foreground" />
            </div>
          </div>
          <div className="bg-background-3 h-[1px] my-4"></div>
          <div className="h-5 flex justify-between">
            <label className="text-base text-secondary-foreground">Offer</label>
            <div className="text-base flex gap-1 items-center">
              <span>{formatAddress(payload)}</span>
              <CopyText text={payload} className="text-secondary-foreground" />
            </div>
          </div>
          <div className="mt-4 h-5 flex justify-between">
            <label className="text-base text-secondary-foreground">Description</label>
            <div className="text-base flex gap-1 items-center">
              {offerDecodeQueryData?.description ?? ''}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            size="lg"
            variant="destructive"
            className="bg-background-3 w-[120px] shrink-0 rounded-full"
            onClick={() => nav(-1)}
          >Back</Button>
          <Button
            size="lg"
            variant="white"
            className="flex-1 rounded-full"
            disabled={sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
          >Confirm Payment</Button>
        </div>
      </Content>
    </ContentWrapper>
  )
}
