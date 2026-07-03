import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AssetAvatar from "./AssetAvatar";
import type { RgbContractDto } from "@/lib/sdk/types";
import { useNodeRgbContractsQuery } from "@/app/queries";
import { useContextStore } from "../stores/contextStore";

interface IProps {
  selectedContractId: string;
  onChange?: (contract: RgbContractDto) => void;
  setContractId?: (id: string) => void;
  contracts?: RgbContractDto[];
  reset?: () => void;
}

export default function AssetSelect(props: IProps) {
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  const rgbContractsQuery = useNodeRgbContractsQuery(activeNodeId, {
    staleTime: 30_000,
  });

  const contracts = rgbContractsQuery.data?.contracts ?? [];

  const changeContract = (contractId: string) => {
    const selected = contracts?.find((c) => c.contract_id === contractId);
    if (!selected) return;

    if (contractId === "null") {
      props.reset && props.reset();
    } else {
      props.setContractId && props.setContractId(contractId);
      props.onChange && props.onChange(selected);
    }
  };

  const selected = contracts?.find(
    (c) => c.contract_id === props.selectedContractId
  );

  return (
    <Select value={props.selectedContractId} onValueChange={changeContract}>
      <SelectTrigger className="bg-background-4">
        <div className="flex gap-3 items-center">
          {selected ? (
            <AssetAvatar className="w-8 h-8" name={selected.name ?? ""} />
          ) : null}
          <SelectValue placeholder="Select Asset" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {!!props.reset ? <SelectItem value="null">None</SelectItem> : null}
        {contracts?.map((c) => (
          <SelectItem key={c.contract_id} value={c.contract_id}>
            {c.name ?? c.ticker ?? c.contract_id.slice(0, 10)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
