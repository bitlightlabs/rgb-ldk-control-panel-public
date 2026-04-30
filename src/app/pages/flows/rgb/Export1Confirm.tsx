import AssetAvatar from "@/app/components/AssetAvatar";
import CopyText from "@/app/components/CopyText";
import ImportStep from "@/app/components/ImportStep";
import IconAlert from "@/app/icons/alert";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { RgbContractDto } from "@/lib/sdk/types";
import { formatAddress } from "@/lib/utils";

interface IProps {
  invoice: string
  amount: string
  decodedContract: RgbContractDto | null
  disabled: boolean
  onNext: () => void
}
export default function Export1Confirm(props: IProps) {
  const { decodedContract } = props;

  return (
    <>
      <ImportStep title="Enter Recipient Invoice" current='02' total="03" />
      <div className="mt-2 text-base text-secondary-foreground leading-5">
        Review the details below and confirm to send the assets from your Lightning Node.
      </div>
      <div className="mt-6 py-3 px-4 bg-background-3 rounded-3xl grid grid-cols-3">
        <div className="flex gap-3 items-center">
          <AssetAvatar className="w-8 h-8" name={decodedContract?.name ?? ''} />
          <div>
            <div className="text-sm text-secondary-foreground leading-[18px]">Export Asset</div>
            <div className="mt-1 text-base leading-5">{decodedContract?.name}</div>
          </div>
        </div>
        <div>
          <div className="text-sm text-secondary-foreground leading-[18px]">Amount</div>
          <div className="flex items-center gap-2 mt-1 text-base leading-5">
            {props.amount}
          </div>
        </div>
        <div>
          <div className="text-sm text-secondary-foreground leading-[18px]">Type</div>
          <div className="flex items-center gap-2 mt-1 text-base leading-5">
            RGB On-chain Invoice
          </div>
        </div>
      </div>
      <div className="mt-10 p-4 rounded-3xl bg-background-3">
        <div>
          <label className="text-base text-secondary-foreground leading-5">Contract ID</label>
          <div className="mt-2 flex gap-2 text-base items-center">
            <span>{formatAddress(decodedContract?.contract_id)}</span>
            <CopyText text={decodedContract?.contract_id ?? ''} className="text-secondary-foreground" />
          </div>
        </div>
        <div className="h-[1px] bg-background-3 my-4"></div>
        <div>
          <label className="text-base text-secondary-foreground leading-5">Payment Request</label>
          <div className="mt-2 text-base flex gap-2">
            {props.invoice}
          </div>
        </div>
      </div>
      <Alert variant="destructive" className="mt-3">
        <AlertDescription className="text-base flex gap-4">
          Assets will be sent from your Lightning Node to the provided address. This action cannot be undone.
        </AlertDescription>
      </Alert>
      <div className="mt-10">
        <Button
          size="lg"
          variant="white"
          className="w-full rounded-full"
          disabled={props.disabled}
          onClick={props.onNext}
        >Confirm & Send</Button>
      </div>
    </>
  )
}
