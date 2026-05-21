import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AssetAvatar from "./AssetAvatar";
import type { RgbContractDto } from "@/lib/sdk/types";
import { nodeRgbContracts } from "@/lib/commands";
import { useEffect, useState } from "react";
import { useContextStore } from "../stores/contextStore";

interface IProps {
  selectedContractId: string;
  onChange?: (contract: RgbContractDto) => void;
  setContractId?: (id: string) => void;
  contracts?: RgbContractDto[];
  selectedContract?: RgbContractDto;
  reset?: () => void;
}

export default function AssetSelect(props: IProps) {
  const currentContext = useContextStore((s) => s.currentContext);
  const [contractList, setContractList] = useState<RgbContractDto[] | null>(null);
  const activeNodeId = currentContext?.node_id;

  const loadList = async () => {
    if(!activeNodeId) return;

    try {
      const data = await nodeRgbContracts(activeNodeId);
      setContractList(data.contracts);
    } catch(e) {}
  }

  useEffect(() => {
    loadList();
  }, [activeNodeId]);

  const changeContract = (contractId: string) => {
    const selected = contractList?.find(c => c.contract_id === contractId);
    if(!selected) return;

    if (contractId === "null") {
      props.reset && props.reset()
    } else {
      props.setContractId && props.setContractId(contractId)
      props.onChange && props.onChange(selected)
    }
  }

  const selected = contractList?.find(c => c.contract_id === props.selectedContractId);

  return (
    <Select
      value={props.selectedContractId}
      onValueChange={changeContract}
    >
      <SelectTrigger id="recv_rgb_contract_id" className="h-13 rounded-2xl">
        <div className="flex gap-3 items-center">
          {
            selected ? (
              <AssetAvatar className="w-8 h-8" name={selected.name ?? ""} />
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
        {contractList?.map(
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
