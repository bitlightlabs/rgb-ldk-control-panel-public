import AssetAvatar from "@/app/components/AssetAvatar";
import Step from "@/app/components/Step";
import IconArrowRight from "@/app/icons/arrowright";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

interface IProps {
  onClose: () => void;
}
export default function ConfirmDialog(props: IProps) {
  const [step, setStep] = useState<'init' | 'processing'>('init');

  const renderStep = () => {
    if(step === 'init') {
      return (
        <Init
          onNext={() => setStep('processing')}
          onCancel={props.onClose}
        />
      )
    }

    return (
      <Processing
        onCancel={props.onClose}
      />
    )
  }

  return (
    <Dialog
      open
      onOpenChange={props.onClose}
    >
      <DialogContent className="w-[560px]">
        <DialogHeader className="px-3">
          <DialogTitle>Swap</DialogTitle>
        </DialogHeader>
        <div className="relative flex h-[85px]">
          <IconArrowRight className="absolute top-[calc(50%-10px)] left-[calc(50%-10px)]" />
          <div className="flex-1 flex flex-col items-center">
            <AssetAvatar className="w-12 h-12" name="BTC" />
            <div className="mt-3 text-[20px] font-medium">100,000 sats</div>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <AssetAvatar className="w-12 h-12" name="USDT" />
            <div className="mt-3 text-[20px] font-medium">100,000 sats</div>
          </div>
        </div>

        {renderStep()}
      </DialogContent>
    </Dialog>
  )
}

function Init(props: {onNext: () => void, onCancel: () => void}) {
  return (
    <>
      <div>
        <div className="bg-background-3 rounded-3xl px-4 py-4 space-y-4">
          <Row label="Total Fee" value="100,000 sats" />
          <Row label="Market Maker" value="100,000 sats" />
          <Separator />
          <Row label="Market Rate" value="sat = 0.00000626 USDT" />
        </div>
        <div className="mt-4 text-base text-secondary-foreground">
          The received assets will be deposited into your Lightning channel.
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full flex-1"
        >Back</Button>
        <Button
          variant="white"
          size="lg"
          className="rounded-full flex-1"
          onClick={props.onNext}
        >Confirm</Button>
      </DialogFooter>
    </>
  )
}

function Processing(props: {onCancel: () => void}) {
  return (
    <>
      <div>
        <div className="px-4 py-4 bg-background-3 rounded-3xl">
          <Step
            currentStep={3}
            currentStatus="loading"
            list={[
              {title: 'Creating quote', description: ''},
              {title: 'Sending BTC...', description: 'asdfasdfasdf'},
              {title: 'Swap node validation in progress…', description: ''},
              {title: 'Waiting for USDT settlement…', description: ''},
              {title: 'Completed', description: ''},
            ]}
          />
        </div>
        <div className="mt-4 text-base text-secondary-foreground">
          Swaps are settled via RGB Lightning. Received assets will
          be credited to your active Lightning channel after confirmation.
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full flex-1"
          onClick={props.onCancel}
        >Back</Button>
        <Button
          variant="white"
          size="lg"
          className="rounded-full flex-1"
          onClick={() => {}}
        >Confirm</Button>
      </DialogFooter>
    </>
  )
}

function Row(props: {label: string, value: string}) {
  return (
    <div className="flex justify-between text-base">
      <label className="text-secondary-foreground">{props.label}</label>
      <span className="font-medium">{props.value}</span>
    </div>
  )
}
