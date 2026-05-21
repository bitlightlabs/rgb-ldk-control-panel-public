import { Badge } from "@/components/ui/badge";
import AssetAvatar from "./AssetAvatar";
import CopyText from "./CopyText";
import IconDot from "../icons/dot";
import { Button } from "@/components/ui/button";

interface IProps {
  onUnlock?: () => void
}
export default function UtxoItem(props: IProps) {
  return (
    <div className="relative p-5 bg-background-2 rounded-3xl">
      <Badge variant="default" className="absolute right-5 top-5 py-1 px-3 gap-2">
        <IconDot />
        <span>Locked</span>
      </Badge>
      <div>
        <label className="text-xs text-secondary-foreground">Gas Capacity</label>
        <div className="mt-2 text-xs">0.94032659 BTC</div>
      </div>
      <div className="mt-10">
        <label className="text-xs text-secondary-foreground">Output ID</label>
        <div className="mt-2 leading-5 text-base flex items-center gap-2">
          <span>b2a318...e2bd48:0</span>
          <CopyText className="text-secondary-foreground" text={"b2a318...e2bd48:0"} />
        </div>
      </div>
      <div className="mt-10">
        <label className="text-xs text-secondary-foreground">Bound RGB Assets</label>
        <div className="mt-2 space-y-3">
          <div className="flex h-5 items-center justify-between text-base">
            <div className="h-full flex items-center gap-2">
              <AssetAvatar className="w-5 h-5 text-xs" name="ABC" />
              <span>RGB20#1234</span>
            </div>
            <span>1,000.00</span>
          </div>
          <div className="flex h-5 items-center justify-between text-base">
            <div className="h-full flex items-center gap-2">
              <AssetAvatar className="w-5 h-5 text-xs" name="ABC" />
              <span>RGB20#1234</span>
            </div>
            <span>1,000.00</span>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <Button
          variant="white"
          className="rounded-full w-full"
          onClick={props.onUnlock}
        >Unlock UTXO</Button>
      </div>
    </div>
  )
}
