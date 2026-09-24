import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import AssetAvatar from "./AssetAvatar";
import type { RgbContractDto } from "@/lib/sdk/types";
import { useNodeRgbContractsQuery } from "@/app/queries";
import { useContextStore } from "../stores/contextStore";

interface IProps {
  selectedContractId: string;
  onChange?: (contract: RgbContractDto) => void;
}

export default function AssetSelect(props: IProps) {
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  const rgbContractsQuery = useNodeRgbContractsQuery(activeNodeId, {
    enabled: !!activeNodeId,
  });
  const contracts = rgbContractsQuery.data?.contracts ?? [];

  const changeContract = (contractId: string) => {
    const selected = contracts?.find((c) => c.contract_id === contractId);
    if (!selected) return;

    props.onChange && props.onChange(selected);
  };

  const find = contracts.find((c) => c.contract_id === props.selectedContractId);

  return (
    <Select value={props.selectedContractId} onValueChange={changeContract}>
      <SelectTrigger className="bg-background-4">
        {
          find ? (
            <div className="h-7 flex gap-3 items-center">
              <AssetAvatar className="w-7 h-7" name={find.name ?? ""} />
              <span>{find.name}</span>
            </div>
          ) : (
            <span>Select Asset</span>
          )
        }
      </SelectTrigger>
      <SelectContent>
        {contracts?.map((c) => (
          <SelectItem key={c.contract_id} value={c.contract_id}>
            <div className="h-7 flex gap-3 items-center">
              <AssetAvatar className="w-7 h-7" name={c.name ?? ""} />
              <span>{c.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
