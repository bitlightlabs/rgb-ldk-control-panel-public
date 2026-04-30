import CopyText from "@/app/components/CopyText";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatAddress } from "@/lib/utils";
import { useState } from "react";

interface IProps {
  offer: string
  offerDecodeQuery: any
  decodedDescription: string
  onBack: () => void
  onPay: () => void
  disabled: boolean
  offerAmount: string
  setOfferAmountMsat: (amount: string) => void
}
export default function SendOfferConfirm(props: IProps) {
  const { offer, offerDecodeQuery, decodedDescription, offerAmount, setOfferAmountMsat } = props;
  const [step, setStep] = useState<"form" | "confirm">("form");

  const next = () => {
    setStep('confirm');
  }

  console.log(33, offerDecodeQuery?.data)
  const destination = offerDecodeQuery?.data?.destination ?? '';

  if(step === 'form') {
    return (
      <div>
        <div className="bg-background-3 rounded-3xl p-4">
          <div className="h-5 flex justify-between">
            <label className="text-base text-secondary-foreground">Offer</label>
            <div className="text-base flex gap-1 items-center">
              <span>{formatAddress(offer)}</span>
              <CopyText text={offer} className="text-secondary-foreground" />
            </div>
          </div>
          <div className="mt-4 h-5 flex justify-between">
            <label className="text-base text-secondary-foreground">Description</label>
            <div className="text-base flex gap-1 items-center">
              {decodedDescription}
            </div>
          </div>
        </div>

        <Field className="mt-10">
          <FieldLabel>
            Amount To Send
          </FieldLabel>
          <Input
            value={offerAmount}
            onChange={(e) => setOfferAmountMsat(e.currentTarget.value)}
            placeholder="20"
            inputMode="numeric"
            className="h-14 rounded-2xl text-[22px] font-bold"
            action={<span className="text-base">sats</span>}
            // bottom={
            //   <span className="text-sm font-normal">Available: 10 BTC</span>
            // }
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
            onClick={next}
          >Review</Button>
        </div>
      </div>
    )
  }

  return (
    <div>

      <div className="mb-10">
        <div className="text-xl text-center">You Are Sending</div>
        <div className="mt-9 h-10 leading-10 text-center">
          <span className="text-[34px] font-bold">{offerAmount}</span>
          <span className="pl-2 text-[22px]">msat</span>
        </div>
        {/* <div className="mt-2 text-center text-sm text-secondary-foreground">Available: -</div> */}
      </div>

      <div className="bg-background-3 rounded-3xl p-4">
        <div className="h-5 flex justify-between">
          <label className="text-base text-secondary-foreground">To</label>
          <div className="text-base flex gap-1 items-center">
            <span>{formatAddress(destination)}</span>
            <CopyText text={destination} className="text-secondary-foreground" />
          </div>
        </div>
        <div className="bg-background-3 h-[1px] my-4"></div>
        <div className="h-5 flex justify-between">
          <label className="text-base text-secondary-foreground">Offer</label>
          <div className="text-base flex gap-1 items-center">
            <span>{formatAddress(offer)}</span>
            <CopyText text={offer} className="text-secondary-foreground" />
          </div>
        </div>
        <div className="mt-4 h-5 flex justify-between">
          <label className="text-base text-secondary-foreground">Description</label>
          <div className="text-base flex gap-1 items-center">
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
          onClick={props.onPay}
        >Confirm Payment</Button>
      </div>
    </div>
  )
}
