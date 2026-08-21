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
  // setContractId?: (id: string) => void;
  contracts?: RgbContractDto[];
  // reset?: () => void;
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

    props.onChange && props.onChange(selected);
  };

  // const selected = contracts?.find(
  //   (c) => c.contract_id === props.selectedContractId
  // );

  return (
    <Select value={props.selectedContractId} onValueChange={changeContract}>
      <SelectTrigger className="bg-background-4">
        <SelectValue placeholder="Select Asset" />
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
