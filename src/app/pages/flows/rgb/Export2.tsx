import ImportStep from "@/app/components/ImportStep";
import IconAlert from "@/app/icons/alert";
import IconDownload from "@/app/icons/download";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface IProps {
  disabled?: boolean;
  onNext: () => void;
}

export default function Export2(props: IProps) {
  return (
    <div>
      <ImportStep title="Download Ownership Proof" current='03' total="03" />
      <div className="mt-2 text-base text-secondary-foreground leading-5">
        Complete the export by downloading the proof file and importing it into your wallet.
      </div>
      <div className="mt-10 py-10 px-6 bg-background-3 rounded-2xl">
        <div className="w-16 h-16 mx-auto">
          <IconDownload />
        </div>
        <div className="mt-5 text-base text-center">Consignment File Ready</div>
        <div className="mt-1 text-sm text-center text-secondary-foreground">
          Click the button below to download the proof file
        </div>
        <div className="mt-5 flex justify-center">
          <Button
            size="lg"
            variant="white"
            className="w-[240px] rounded-full"
            disabled={props.disabled}
            onClick={props.onNext}
          >Download Consignment File</Button>
        </div>
      </div>

      <div className="mt-10">
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>
            <div>
              You MUST import this file into your Bitlight Wallet history to see your assets. The download alone does not complete the transfer.
            </div>
            <div className="mt-3">
              After importing, your assets will be settled on-chain and appear in your wallet history within a few minutes.
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
