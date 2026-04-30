import AssetAvatar from "@/app/components/AssetAvatar";
import CopyText from "@/app/components/CopyText";
import ImportStep from "@/app/components/ImportStep";
import RgbUtxoSelect from "@/app/components/RgbUtxoSelect";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { RgbContractDto } from "@/lib/sdk/types";
import { formatAddress } from "@/lib/utils";

interface IProps {
  selectedContract: RgbContractDto | null
  disabled: boolean
  amount: string
  setAmount: (v: string) => void
  setUtxo: (v: string) => void
  onNext: () => void
}
export default function Import2(props: IProps) {
  const { selectedContract, amount, setAmount } = props;

  return (
    <>
      <ImportStep title="Configure Invoice" current='02' total="04" />
      <div className="mt-2 text-base text-secondary-foreground leading-5">
        This works the same way as a standard RGB transfer. Once the invoice is created, simply pay it with the wallet extension.
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
        <Field>
          <FieldLabel>Amount to Receive</FieldLabel>
          <Input
              value={amount}
              onChange={(e) => setAmount(e.currentTarget.value)}
              inputMode="numeric"
              className="h-13 rounded-2xl text-[22px] font-bold"
              action={<span className="text-base">{selectedContract?.name}</span>}
            />
        </Field>
        <Field className="mt-10">
          <FieldLabel>Select Anchor UTXO</FieldLabel>
          <RgbUtxoSelect
            onChangeUtxo={props.setUtxo}
          />
        </Field>
        <div className="mt-3 text-base text-secondary-foreground">
          If no eligible UTXO is available, create a new one in your wallet first.
        </div>
        <div className="mt-10">
          <Button
            size="lg"
            variant="white"
            className="w-full rounded-full"
            disabled={props.disabled}
            onClick={props.onNext}
          >Generate Invoice</Button>
        </div>
      </div>
    </>
  )
}
