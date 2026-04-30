import AssetSelect from "@/app/components/AssetSelect";
import RgbUtxoSelect from "@/app/components/RgbUtxoSelect";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { RgbContractDto } from "@/lib/sdk/types";

interface IProps {
  contracts: RgbContractDto[];
  selectedContractId: string;
  changeContractId: (id: string) => void;
  rgbAssetAmount: string;
  setRgbAssetAmount: (amount: string) => void;
  setCurrentRgbUtxo: (utxo: string) => void;
  description: string;
  setDescription: (description: string) => void;
}
export default function OnchainInvoiceRGBForm(props: IProps) {
  const {
    contracts,
    selectedContractId,
    changeContractId,
    rgbAssetAmount,
    setRgbAssetAmount,
    setCurrentRgbUtxo,
    description,
    setDescription,
  } = props

  const selectedRgbContract = contracts.find(c => c.contract_id === selectedContractId)

  return (
    <div className="space-y-10">
      <Field>
        <FieldLabel>
          RGB Asset
        </FieldLabel>
        <AssetSelect
          contracts={contracts}
          selectedContractId={selectedContractId}
          setContractId={changeContractId}
          selectedContract={selectedRgbContract}
        />
      </Field>
      <Field>
        <FieldLabel>Amount</FieldLabel>
        <Input
          value={rgbAssetAmount}
          onChange={(e) =>
            setRgbAssetAmount(e.currentTarget.value)
          }
          inputMode="numeric"
          placeholder="21"
          className="h-14 rounded-2xl text-[22px] font-bold"
          action={
            <>
              <span className="text-base">{selectedRgbContract?.name}</span>
            </>
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="recv_rgb_carrier">
          Blinding Utxo
        </FieldLabel>
        <RgbUtxoSelect onChangeUtxo={setCurrentRgbUtxo} />
      </Field>
      <Field>
        <FieldLabel>Description</FieldLabel>
        <Input
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          className="h-13 rounded-2xl text-[22px] font-bold"
        />
      </Field>
    </div>
  )
}
