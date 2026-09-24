import type { LspPricingAsset } from "@/lib/sdk/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import AssetAvatar from "@/app/components/AssetAvatar";

interface IProps {
  selectedAssetId: string;
  onChange: (contract: LspPricingAsset) => void;
  contracts: LspPricingAsset[];
}
export default function LspAssetSelect(props: IProps) {
  const { contracts } = props;

  const changeAsset = (assetId: string) => {
    const selected = contracts?.find((c) => c.asset_id === assetId);
    if (!selected) return;

    props.onChange(selected);
  };

  const find = contracts.find((c) => c.asset_id === props.selectedAssetId);

  return (
    <Select value={props.selectedAssetId} onValueChange={changeAsset}>
      <SelectTrigger className="bg-background-4">
        {
          find ? (
            <div className="h-7 flex gap-3 items-center">
              <AssetAvatar className="w-7 h-7" name={find.ticker ?? ""} />
              <span>{find.ticker}</span>
            </div>
          ) : (
            <span>Select Asset</span>
          )
        }
      </SelectTrigger>
      <SelectContent>
        {contracts.map((c) => (
          <SelectItem key={c.asset_id} value={c.asset_id}>
            <div className="h-7 flex gap-3 items-center">
              <AssetAvatar className="w-7 h-7" name={c.ticker ?? ""} />
              <span>{c.ticker}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
