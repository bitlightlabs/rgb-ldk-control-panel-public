import AssetAvatar from "@/app/components/AssetAvatar";
import CopyText from "@/app/components/CopyText";
import ImportStep from "@/app/components/ImportStep";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { RgbContractDto } from "@/lib/sdk/types";
import { formatAddress } from "@/lib/utils";
import { readText } from "@tauri-apps/plugin-clipboard-manager";

interface IProps {
  consignmentLink: string,
  setConsignmentLink: (link: string) => void
  selectedContract: RgbContractDto | null
  disabled: boolean
  onNext: () => void
}
export default function Import3Consignment(props: IProps) {
  const { consignmentLink, selectedContract, disabled } = props;

  const pasteText = async () => {
    try {
      const text = await readText();
      props.setConsignmentLink(text);
    } catch(e) {
      console.log(e)
    }
  }

  return (
    <div>
      <ImportStep title="Finalize Import" current='04' total="04" />
      <div className="mt-2 text-base text-secondary-foreground leading-5">
        Complete the import by submitting the Consignment Link from your wallet.
      </div>
      <div className="mt-6 py-3 px-4 bg-background-3 rounded-3xl grid grid-cols-2">
        <div className="flex gap-3 items-center">
          <AssetAvatar className="w-8 h-8" name={selectedContract?.name ?? ''} />
          <div>
            <div className="text-sm text-secondary-foreground leading-[18px]">Import Asset</div>
            <div className="mt-1 text-base leading-5">{selectedContract?.name}</div>
          </div>
        </div>
        <div>
          <div className="text-sm text-secondary-foreground leading-[18px]">Contract ID</div>
          <div className="flex items-center gap-2 mt-1 text-base leading-5">
            <span>{formatAddress(selectedContract?.contract_id)}</span>
            <CopyText text={selectedContract?.contract_id ?? ''} className="text-secondary-foreground" />
          </div>
        </div>
      </div>
      <div className="mt-10">
        <Field className="mt-10">
          <FieldLabel>
            Consignment Link (Proof of Transfer)
          </FieldLabel>

          <Textarea
            value={consignmentLink}
            onChange={(e) => props.setConsignmentLink(e.currentTarget.value)}
            placeholder="Paste the consignment link here..."
            className="rounded-2xl text-[22px] font-bold min-h-[90px]"
            action={
              <Button
                variant="destructive"
                className="w-14 h-7 rounded-full text-sm"
                onClick={pasteText}
              >Paste</Button>
            }
          />
        </Field>
      </div>

      <div className="mt-10">
        <Button
          size="lg"
          variant="white"
          className="w-full rounded-full"
          disabled={disabled}
          onClick={props.onNext}
        >Confirm & Finalize Import</Button>
      </div>
      <div className="mt-6 text-base text-secondary-foreground">After confirmation, your assets will be imported to the RGB Lightning node</div>
    </div>
  )
}
