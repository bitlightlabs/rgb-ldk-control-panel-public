import { useNodeSwapExecuteMutation } from "@/app/mutations/swap"
import { useNodeSwapInfoQuery } from "@/app/queries/swap"
import { useContextStore } from "@/app/stores/contextStore"
import type { RgbContractDto } from "@/lib/sdk/types"
import { toast } from "sonner"
import { errorToText } from "@/lib/errorToText"
import { Store } from '@tauri-apps/plugin-store'
import { LOCAL_SWAP_STRING } from "@/app/config/constant"
import { useEffect } from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Row from "../Row"
import { CopyTextInline } from "../CopyText"
import AssetAvatar from "../AssetAvatar"
import { Button } from "@/components/ui/button"
import { parseSwapInfo } from "@/lib/swap"

export default function SwapDetailDialog(props: {
  contract?: RgbContractDto | null,
  paymentHash: string,
  onClose: () => void
  onRefresh: () => void
}) {
  const [swapString, setSwapString] = useState<string>('')
  const { currentContext } = useContextStore()
  const nodeid = currentContext?.node_id ?? ''

  const query = useNodeSwapInfoQuery(nodeid, props.paymentHash, {
    enabled: !!nodeid && !!props.paymentHash
  })

  const executeMutation = useNodeSwapExecuteMutation()

  const executeSwap = async () => {
    try {
      // Check if expiry time has passed
      const data = query.data
      const createdTime = Number(data?.created_at_unix_secs || '0') * 1000;
      const expiryTime = createdTime + (Number(data?.expiry_secs || '0') * 1000);
      if (Date.now() > expiryTime) {
        throw new Error('Swap has expired.');
      }

      await executeMutation.mutateAsync({
        nodeId: nodeid,
        request: {
          // Swap string or Payment hash can be used to execute the swap.
          // Here we are using the payment hash.
          // swap_string '',
          payment_hash: props.paymentHash
        }
      })

      toast.success('Swap transaction executed successfully.')
      props.onClose()
      props.onRefresh()
    } catch(e) {
      toast.error(errorToText(e))
    }
  }

  const loadSwapString = async () => {
    try {
      const store = await Store.load(LOCAL_SWAP_STRING)
      const str = await store.get<string>(props.paymentHash)
      if(str) {
        setSwapString(str)
      }
    } catch(e) {}
  }

  useEffect(() => {
    loadSwapString()
  }, [])

  const data = query.data
  const isMaker = data?.role === 'Maker'
  const detail = parseSwapInfo(data, props.contract)

  return (
    <Dialog
      open
      onOpenChange={props.onClose}
    >
      <DialogContent className="w-[560px]">
        <DialogHeader >
          <DialogTitle>{isMaker ? 'Send' : 'Receive'} Details</DialogTitle>
        </DialogHeader>
        <div className="relative flex justify-between items-center">
          <div>
            <label className="text-xs text-secondary-foreground">Send</label>
            <div className="mt-2 leading-10">
              <span className="text-[34px] font-bold">{detail.fromAssetAmount}</span>
              <span className="text-xl font-bold ml-1">{detail.fromAssetUnit}</span>
            </div>
          </div>
          <div>
            <AssetAvatar
              className="w-10 h-10"
              name={detail.fromAssetName ?? ''}
            />
          </div>
        </div>
        <div className="relative flex justify-between items-center">
          <div>
            <label className="text-xs text-secondary-foreground">Receive</label>
            <div className="mt-2 leading-10">
              <span className="text-[34px] font-bold">{detail.toAssetAmount}</span>
              <span className="text-xl font-bold ml-1">{detail.toAssetUnit}</span>
            </div>
          </div>
          <div>
            <AssetAvatar
              className="w-10 h-10"
              name={detail.toAssetName ?? ''}
            />
          </div>
        </div>

        <div className="bg-background-3 rounded-3xl px-4 py-4 space-y-4">
          <Row
            label="Payment ID"
            value={
              <div>
                <CopyTextInline buttonClassName="text-secondary-foreground" text={props.paymentHash} />
              </div>
            }
          />
          <Row
            label="Swap String"
            value={
              <div>
                <CopyTextInline buttonClassName="text-secondary-foreground" text={swapString} />
              </div>
            }
          />
          <Row
            label="Created Time"
            value={
              <div>
                {new Date(Number(data?.created_at_unix_secs || '0') * 1000).toLocaleString()}
              </div>
            }
          />
          <Row
            label="Expiry Time"
            value={
              <div>
                {new Date(
                  Number(data?.created_at_unix_secs || '0') * 1000
                  + (Number(data?.expiry_secs || '0') * 1000)
                ).toLocaleString()}
              </div>
            }
          />
          <Row
            label="Status"
            value={
              <div
                className={
                  data?.status === 'Failed'
                    ? 'text-error'
                    : (data?.status === 'Settled' ? 'text-success' : '')
                }
              >
                {data?.status ?? ''}
              </div>
            }
          />
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full flex-1"
            onClick={props.onClose}
          >Close</Button>
          {
            isMaker && data?.status === 'Accepted' ? (
              <Button
                variant="white"
                size="lg"
                className="rounded-full flex-1"
                loading={executeMutation.isPending}
                onClick={executeSwap}
              >Execute</Button>
            ) : null
          }
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
