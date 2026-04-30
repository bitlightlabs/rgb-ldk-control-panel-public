import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AssetAvatar from "./AssetAvatar";
import type { RgbContractDto } from "@/lib/sdk/types";

interface IProps {
  contracts: RgbContractDto[];
  selectedContractId: string;
  setContractId: (id: string) => void;
  selectedContract?: RgbContractDto;
  reset?: () => void;
}

export default function AssetSelect(props: IProps) {
  const { contracts, selectedContractId, setContractId } = props

  const selected = contracts?.find((c) => c.contract_id === selectedContractId)

  const changeContract = (contractId: string) => {
    if (contractId === "null") {
      props.reset && props.reset()
    } else {
      setContractId(contractId)
    }
  }

  return (
    <Select
      value={selectedContractId}
      onValueChange={changeContract}
    >
      <SelectTrigger id="recv_rgb_contract_id" className="h-13 rounded-2xl">
        <div className="flex gap-3 items-center">
          {
            selected ? (
              <AssetAvatar className="w-8 h-8" name={selected?.name ?? ""} />
            ) : null
          }
          <SelectValue placeholder="Pick RGB asset..." />
        </div>
      </SelectTrigger>
      <SelectContent>
        {
          !!props.reset ? (
            <SelectItem value="null">None</SelectItem>
          ) : null
        }
        {contracts.map(
          (c) => (
            <SelectItem
              key={c.contract_id}
              value={c.contract_id}
            >
              {c.name ??
                c.ticker ??
                c.contract_id.slice(0, 10)}
            </SelectItem>
          )
        )}
      </SelectContent>
    </Select>
  )
}
