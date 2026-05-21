import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { ComplexInput } from "@/components/ui/input";
import Fee from "./Fee";
import { useState } from "react";
import CopyText from "./CopyText";
import Row from "./Row";

interface IProps {
  onClose: () => void
}
export default function CreateUtxoDialog(props: IProps) {
  const [preview, setPreview] = useState(false)

  if(preview) {
    return (
      <Dialog
        open
        onOpenChange={props.onClose}
      >
        <DialogContent className="w-[560px] px-5 py-5">
          <DialogHeader>
            <DialogTitle>Sign Transaction</DialogTitle>
          </DialogHeader>
          <div className="text-center font-bold">
            <div>
              <span className="text-[34px]">50000</span>
              <span className="pl-2 text-xl">sats</span>
            </div>
            <div className="mt-2 text-xs text-secondary-foreground font-normal">UTXO Value</div>
          </div>
          <div className="bg-background-2 rounded-3xl p-4 space-y-4">
            <Row
              label="To"
              value={
                <div className="h-full flex items-center gap-2">
                  <span>brc1bD21...3b1kzGyU</span>
                  <CopyText className="text-secondary-foreground" text="brc1bD21...3b1kzGyU" />
                </div>
              }
            />
            <div className="h-[1px] border border-dashed border-t-background-2" />
            <Row
              label="Network fee"
              value="1546 sats"
            />
            <Row
              label="Fee Rate"
              value="1546 sats/vb"
            />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              type="button"
              size="lg"
              className="rounded-full flex-1"
              onClick={props.onClose}
            >
              Reject
            </Button>
            <Button
              variant="white"
              type="button"
              size="lg"
              className="rounded-full flex-1"
            >
              Pay & Create
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
      <DialogContent className="w-[560px] px-5 py-5">
        <DialogHeader>
          <DialogTitle>Create UTXO</DialogTitle>
        </DialogHeader>
        <Field>
          <FieldLabel>UTXO Value</FieldLabel>
          <ComplexInput
            action={
              <div className="h-7 flex items-center gap-2.5">
                <span className="text-base">sats</span>
                <Button
                  className="h-7 rounded-full text-xs"
                >MAX</Button>
              </div>
            }
            bottom={
              <span className="text-xs text-secondary-foreground">Available: - sats</span>
            }
          />
        </Field>
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

