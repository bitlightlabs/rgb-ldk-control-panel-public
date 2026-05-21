import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import Fee from "./Fee";
import { useState } from "react";
import CopyText from "./CopyText";
import Row from "./Row";
import AssetAvatar from "./AssetAvatar";

interface IProps {
  onClose: () => void
}
export default function UnlockUtxoDialog(props: IProps) {
  const [preview, setPreview] = useState(false)

  if(preview) {
    return (
      <Dialog
        open
        onOpenChange={props.onClose}
      >
        <DialogContent className="w-[560px] px-5 py-5">
          <DialogHeader>
            <DialogTitle>Unlock UTXO</DialogTitle>
          </DialogHeader>
          <div className="bg-background-2 rounded-3xl p-4 space-y-4">
            <Row
              label="Unlock UTXO"
              value={
                <div className="h-full flex items-center gap-2">
                  <span>brc1bD21...3b1kzGyU</span>
                  <CopyText className="text-secondary-foreground" text="brc1bD21...3b1kzGyU" />
                </div>
              }
            />
            <Row
              label="Transaction Fee"
              value="1546 sats/vb"
            />
          </div>
          <Field>
            <FieldLabel>Fee</FieldLabel>
            <div>
              <Fee onFeeChange={(value) => console.log(value)} />
            </div>
          </Field>

          <DialogFooter>
            <Button
              variant="destructive"
              type="button"
              size="lg"
              className="rounded-full flex-1"
              onClick={props.onClose}
            >
              Cancel
            </Button>
            <Button
              variant="white"
              type="button"
              size="lg"
              className="rounded-full flex-1"
              onClick={() => setPreview(true)}
            >
              Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog
      open
      onOpenChange={props.onClose}
    >
      <DialogContent className="w-[400px] px-5 py-5">
        <DialogHeader>
          <DialogTitle>Notice</DialogTitle>
        </DialogHeader>
        <div className="text-base">
          <div>
            UTXO unlocking requires a transaction fee.
          </div>
          <div className="mt-3">
            After unlocking, the available BTC in the
            original UTXO will be transferred to your BTC
            balance.
          </div>
          <div className="mt-6 font-medium text-primary">
            You will forfeit these RGB assets:
          </div>
          <div className="mt-3 bg-background-2 rounded-2xl p-4 space-y-3">
            <Row
              label={
                <div className="flex items-center gap-2">
                  <AssetAvatar className="text-xs w-5 h-5" name="Ordinal" />
                  <span>Ordinal #1234</span>
                </div>
              }
              value="1,000.00"
            />
            <Row
              label={
                <div className="flex items-center gap-2">
                  <AssetAvatar className="text-xs w-5 h-5" name="USDT" />
                  <span>USDT</span>
                </div>
              }
              value="1,000.00"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            type="button"
            size="lg"
            className="rounded-full flex-1"
            onClick={props.onClose}
          >
            Cancel
          </Button>
          <Button
            variant="white"
            type="button"
            size="lg"
            className="rounded-full flex-1"
            // disabled
            onClick={() => setPreview(true)}
          >
            5s
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

