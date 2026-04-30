import AssetSelect from "@/app/components/AssetSelect";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { RgbContractDto } from "@/lib/sdk/types";

interface IProps {
  contracts: RgbContractDto[];
  selectedContractId: string;
  changeContractId: (id: string) => void;
  rgbAmount: string;
  setRgbAmount: (value: string) => void;
  description: string;
  setDescription: (description: string) => void;
  btcCarrierSat: string;
  setBtcCarrierSat: (value: string) => void;
}
export default function RGBInvoiceForm(props: IProps) {
  const {
    contracts,
    selectedContractId,
    changeContractId,
    rgbAmount,
    setRgbAmount,
    description,
    setDescription,
    btcCarrierSat,
    setBtcCarrierSat
  } = props;

  const selectedRgbContract = contracts.find(c => c.contract_id === selectedContractId)

  return (
    <div className="space-y-10">
      <Field>
        <FieldLabel>
          Asset
        </FieldLabel>
        <AssetSelect
          contracts={contracts}
          selectedContractId={selectedContractId}
          setContractId={changeContractId}
          selectedContract={selectedRgbContract}
        />
      </Field>
      <Field>
        <FieldLabel>Amount to Receive</FieldLabel>
        <Input
          value={rgbAmount}
          onChange={(e) =>
            setRgbAmount(e.currentTarget.value)
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
        <FieldLabel>
          BTC Carrier
        </FieldLabel>
        <Input
          value={btcCarrierSat}
          onChange={(e) =>
            setBtcCarrierSat(e.currentTarget.value)
          }
          inputMode="numeric"
          placeholder="5000"
          className="h-14 rounded-2xl text-[22px] font-bold"
          action={
            <>
              <span className="text-base">sat</span>
            </>
          }
        />
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
