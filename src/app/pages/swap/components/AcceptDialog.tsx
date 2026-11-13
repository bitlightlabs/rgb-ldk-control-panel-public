import AssetAvatar from "@/app/components/AssetAvatar"
import { CopyTextInline } from "@/app/components/CopyText"
import Row from "@/app/components/Row"
import { useNodeSwapAcceptMutation } from "@/app/mutations/swap"
import { useContextStore } from "@/app/stores/contextStore"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { errorToText } from "@/lib/errorToText"
import type { RgbContractDto, SwapInfoDto } from "@/lib/sdk/generated-types"
import { parseSwapInfo } from "@/lib/swap"
import { toast } from "sonner"

export default 
function AcceptDialog(props: {
  swapString: string,
  contract: RgbContractDto | null,
  data: SwapInfoDto | null,
  onClose: () => void
  onSuccess: () => void
}) {
  const { swapString, data } = props
  const { currentContext } = useContextStore()
  const nodeId = currentContext?.node_id ?? ''

  const nodeswapAccept = useNodeSwapAcceptMutation();

  const acceptSwap = async () => {
    try {
      // Check if expiry time has passed
      const createdTime = Number(data?.created_at_unix_secs || '0') * 1000;
      const expiryTime = createdTime + (Number(data?.expiry_secs || '0') * 1000);
      if (Date.now() > expiryTime) {
        throw new Error('Swap has expired.');
      }

      await nodeswapAccept.mutateAsync({ nodeId, swapString });
      toast.success('Swap transaction accepted successfully.')
      props.onClose()
      props.onSuccess()
    } catch(e) {
      toast.error(errorToText(e))
    }
  }

  const isMaker = data?.role === 'Maker'
  const swapDetail = parseSwapInfo(data, props.contract)

  return (
    <Dialog
      open
      onOpenChange={props.onClose}
    >
      <DialogContent className="w-[560px]">
        <DialogHeader>
          <DialogTitle>{isMaker ? 'Send' : 'Receive'} Details</DialogTitle>
        </DialogHeader>
        <div className="relative flex justify-between items-center">
          <div>
            <label className="text-xs text-secondary-foreground">Send</label>
            <div className="mt-2 leading-10">
              <span className="text-[34px] font-bold">{swapDetail.fromAssetAmount}</span>
              <span className="text-xl font-bold ml-1">{swapDetail.fromAssetUnit}</span>
            </div>
          </div>
          <div>
            <AssetAvatar
              className="w-10 h-10"
              name={swapDetail.fromAssetName ?? ''}
            />
          </div>
        </div>
        <div className="relative flex justify-between items-center">
          <div>
            <label className="text-xs text-secondary-foreground">Receive</label>
            <div className="mt-2 leading-10">
              <span className="text-[34px] font-bold">{swapDetail.toAssetAmount}</span>
              <span className="text-xl font-bold ml-1">{swapDetail.toAssetUnit}</span>
            </div>
          </div>
          <div>
            <AssetAvatar
              className="w-10 h-10"
              name={swapDetail.toAssetName ?? ''}
            />
          </div>
        </div>

        <div className="bg-background-3 rounded-3xl px-4 py-4 space-y-4">
          <Row
            label="Execution ID"
            value={
              <div>
                <CopyTextInline buttonClassName="text-secondary-foreground" text={props.data?.execution_id ?? ''} />
              </div>
            }
          />
          <Row
            label="BTC carrier"
            value={
              <div>
                {BigInt(props.data?.btc_carrier_amount_msat || 0) / BigInt(1000)} sats
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
              <div>
                {data?.status ?? ''}
              </div>
            }
          />
        </div>
        <DialogFooter>
          <Button
            variant="white"
            size="lg"
            className="rounded-full flex-1"
            loading={nodeswapAccept.isPending}
            onClick={acceptSwap}
          >Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
