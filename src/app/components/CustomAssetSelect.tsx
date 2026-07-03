import IconTriangleDown from "../icons/triangle";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CopyText from "./CopyText";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import AssetAvatar from "./AssetAvatar";


interface CustomAssetSelectProps {
  value: string;
  list: {name: string}[]
  onChange?: (data: {name: string}) => void;
}
export function CustomAssetSelect(props: CustomAssetSelectProps) {
  const { value, list } = props;
  const [showSelect, setShowSelect] = useState(false);

  const change = (v: string) => {
    const selected = list.find(c => c.name === v);
    if (selected && props.onChange) {
      props.onChange(selected);
    }
  }

  return (
    <div>
      <button
        className="h-[30px] rounded-full px-1 py-1 bg-background-3 gap-1 border border-input"
        onClick={() => setShowSelect(true)}
      >
        <div className="flex gap-1 items-center">
          <AssetAvatar className="w-5 h-5" name={value} />
          <span className="text-xs">{value}</span>
          <IconTriangleDown />
        </div>
      </button>

      <Dialog
        open={showSelect}
        onOpenChange={() => setShowSelect(false)}
      >
        <DialogContent className="w-[560px] px-2">
          <DialogHeader className="px-3">
            <DialogTitle>Select Send Assets</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <AssetItem />
            <AssetItem />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AssetItem() {
  return (
    <div className="h-16 px-3 rounded-2xl flex justify-between items-center hover:bg-background-3">
      <div className="h-10 flex gap-3">
        <AssetAvatar className="w-10 h-10" name="USDT" />
        <div>
          <h4 className="text-base font-medium leading-5">LIGHT</h4>
          <div className="mt-0.5 text-xs text-secondary-foreground flex h-5 items-center gap-2">
            <span>Contract: rgb1tad7...wq8p0je6</span>
            <CopyText text="rgb1tad7...wq8p0je6" />
          </div>
        </div>
      </div>
      <Button
        variant="default"
        className="h-7 px-2.5 rounded-full text-xs"
      >Import</Button>
    </div>
  )
}
