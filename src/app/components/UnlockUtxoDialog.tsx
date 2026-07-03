import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import Fee from "./Fee";
import { useEffect, useRef, useState } from "react";
import CopyText from "./CopyText";
import Row from "./Row";
import {
  useNodeWalletNewAddressMutation,
  useRgbUtxoSweepMutation,
} from "@/app/mutations";
import { useContextStore } from "../stores/contextStore";
import type { RgbUtxoDto } from "@/lib/sdk/generated-types";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";
import { formatAddress } from "@/lib/utils";
// import AssetAvatar from "./AssetAvatar";

interface IProps {
  utxo: RgbUtxoDto
  onClose: () => void
  onSuccess: () => void
}
export default function UnlockUtxoDialog(props: IProps) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(false)
  const [count, setCount] = useState(5)
  const timer = useRef<number>(0)
  const currentContext = useContextStore((s) => s.currentContext);
  const [feeRate, setFeeRate] = useState('0')

  const sweepMutation = useRgbUtxoSweepMutation();
  const newAddressMutation = useNodeWalletNewAddressMutation();

  const unlock = async () => {
    if (!currentContext) return

    try {
      setLoading(true)

      const nodeId = currentContext.node_id
      const btcAddress = await newAddressMutation.mutateAsync(nodeId)
      await sweepMutation.mutateAsync({
        nodeId: currentContext.node_id,
        request: {
          input: {
            outpoint: props.utxo.outpoint
          },
          destination_address: btcAddress.address,
          fee_rate_sats_per_vb: Number(feeRate)
        }
      })
      props.onClose()
      props.onSuccess()
    } catch (e) {
      toast.error(errorToText(e))
    } finally {
      setLoading(false)
    }
  }

  const countDown = () => {
    timer.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(timer.current)
          return 0
        }
        return c - 1
      })
    }, 1000) as unknown as number
  }

  useEffect(() => {
    countDown()
  }, [])

  const renderContent = () => {
    if(preview) {
      return (
        <DialogContent className="w-[560px] px-5 py-5">
          <DialogHeader>
            <DialogTitle>Unlock UTXO</DialogTitle>
          </DialogHeader>
          <div className="bg-background-2 rounded-3xl p-4 space-y-4">
            <Row
              label="Unlock UTXO"
              value={
                <div className="h-full flex items-center gap-2">
                  <span>{formatAddress(props.utxo.outpoint)}</span>
                  <CopyText className="text-secondary-foreground" text={props.utxo.outpoint} />
                </div>
              }
            />
          </div>
          <Field>
            <FieldLabel>Fee</FieldLabel>
            <div>
              <Fee onFeeChange={setFeeRate} />
            </div>
          </Field>

          <DialogFooter>
            <Button
              variant="destructive"
              type="button"
              size="lg"
              className="rounded-full flex-1"
              disabled={loading}
              onClick={props.onClose}
            >
              Cancel
            </Button>
            <Button
              variant="white"
              type="button"
              size="lg"
              className="rounded-full flex-1"
              disabled={loading}
              onClick={unlock}
            >
              Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      )
    }

    return (
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
          {/* <div className="mt-6 font-medium text-primary">
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
          </div> */}
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
            disabled={count > 0}
            onClick={() => setPreview(true)}
          >
            {count > 0 ? `${count}s` : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    )
  }

  return (
    <Dialog
      open
      onOpenChange={props.onClose}
    >
      {renderContent()}
    </Dialog>
  )
}
