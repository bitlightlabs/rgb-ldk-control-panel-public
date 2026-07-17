import type { RgbContractDto, SwapInfo } from "@/lib/sdk/types";
import AssetAvatar from "../AssetAvatar";
import { CopyTextInline } from "../CopyText";
import IconArrowRight from "@/app/icons/arrowright";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { useContextStore } from "@/app/stores/contextStore";
import { useNodeSwapInfoQuery } from "@/app/queries/swap";
import { formatNumber } from "@/lib/number";
import Row from "../Row";
import { Button } from "@/components/ui/button";
import { useNodeSwapExecuteMutation } from "@/app/mutations/swap";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";
import { Badge } from "@/components/ui/badge";
import { Store } from '@tauri-apps/plugin-store'
import { LOCAL_SWAP_STRING } from "@/app/config/constant";

interface IProps {
  data: SwapInfo
  contracts: RgbContractDto[]
}

export default function SwapItem(props: IProps) {
  const { data, contracts } = props;
  const [showDetailHash, setShowDetailHash] = useState<string>('');

  const contract = contracts.find((c) => c.contract_id === data.contract_id)
  const isMaker = data.role === 'Maker'
  const makerGivesRgb = data.maker_gives_rgb
  const precision = contract?.precision ?? 0

  const fromAsset = isMaker && makerGivesRgb ?
    contract?.name :
    'BTC'
  const fromAmount = fromAsset === 'BTC' ?
    (BigInt(data.btc_amount_msat) / BigInt(1000)).toString() :
    formatNumber(data.asset_amount || 0, precision)
  const fromUnit = fromAsset === 'BTC' ? 'sats' : contract?.name

  const toAsset = fromAsset === 'BTC' ? contract?.name : 'BTC'
  const toAmount = fromAsset === 'BTC' ?
    formatNumber(data.asset_amount || 0, precision) :
    (BigInt(data.btc_amount_msat) / BigInt(1000)).toString()
  const toUnit = toAsset === 'BTC' ? 'sats' : contract?.name

  return (
    <>
      <div
        onClick={() => setShowDetailHash(data.payment_hash)}
        className="h-17 px-3 flex justify-between items-center hover:bg-background-3 rounded-2xl"
      >
        <div className="h-10 flex gap-3">
          <div className="relative h-[42px] w-[42px]">
            <AssetAvatar
              className="absolute top-0 left-0 w-[30px] h-[30px] z-10"
              name={fromAsset ?? ''}
            />
            <AssetAvatar
              className="absolute right-0 bottom-0 w-[30px] h-[30px] z-20 border-1 border-background"
              name={toAsset ?? ''}
            />
          </div>
          <div>
            <div className="text-base font-medium leading-5 flex items-center gap-1">
              <span>{fromAsset ?? ''}</span>
              <IconArrowRight className="w-4 h-4 text-secondary-foreground" />
              <span>{toAsset ?? ''}</span>
              <Badge
                className="py-0 px-1.5 h-5 ml-2 text-xs"
                variant={data.status === 'Settled' ? 'success' : 'default'}
              >{data.status}</Badge>
            </div>
            <div className="mt-1 text-xs text-secondary-foreground flex gap-2 items-center">
              <span>Payment Hash: </span>
              <CopyTextInline text={data.payment_hash} />
            </div>
          </div>
        </div>
        <div className="text-right text-base">
          <div className="text-base leading-5 font-normal">
            - {fromAmount} {fromUnit}
          </div>
          <div className="mt-1 text-success font-normal">
            + {toAmount} {toUnit}
          </div>
        </div>
      </div>

      {
        showDetailHash ? (
          <DetailDialog
            contract={contract}
            paymentHash={showDetailHash}
            onClose={() => setShowDetailHash('')}
          />
        ) : null
      }
    </>
  )
}

function DetailDialog(props: {
  contract: RgbContractDto | undefined,
  paymentHash: string,
  onClose: () => void
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
      await executeMutation.mutateAsync({
        nodeId: nodeid,
        request: {
          // swap_string '',
          payment_hash: props.paymentHash
        }
      })

      toast.success('Swap transaction executed successfully.')
      props.onClose()
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
  const makerGivesRgb = data?.maker_gives_rgb
  const precision = props.contract?.precision ?? 0

  const sendAsset = isMaker && makerGivesRgb ?
    props.contract?.name :
    'BTC'
  const sendAmount = sendAsset === 'BTC' ?
    (BigInt(data?.btc_amount_msat || 0) / BigInt(1000)).toString() :
    formatNumber(data?.asset_amount || 0, precision)
  const sendUnit = sendAsset === 'BTC' ? 'sats' : props.contract?.name

  const receiveAsset = sendAsset === 'BTC' ? props.contract?.name : 'BTC'
  const receiveAmount = sendAsset === 'BTC' ?
    formatNumber(data?.asset_amount || 0, precision) :
    (BigInt(data?.btc_amount_msat || 0) / BigInt(1000)).toString()
  const receiveUnit = receiveAsset === 'BTC' ? 'sats' : props.contract?.name

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
              <span className="text-[34px] font-bold">{sendAmount}</span>
              <span className="text-xl font-bold ml-1">{sendUnit}</span>
            </div>
          </div>
          <div>
            <AssetAvatar
              className="w-10 h-10"
              name={sendAsset ?? ''}
            />
          </div>
        </div>
        <div className="relative flex justify-between items-center">
          <div>
            <label className="text-xs text-secondary-foreground">Receive</label>
            <div className="mt-2 leading-10">
              <span className="text-[34px] font-bold">{receiveAmount}</span>
              <span className="text-xl font-bold ml-1">{receiveUnit}</span>
            </div>
          </div>
          <div>
            <AssetAvatar
              className="w-10 h-10"
              name={receiveAsset ?? ''}
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
            label="Timestamp"
            value={
              <div>
                {new Date(Number(data?.created_at_unix_secs || '0') * 1000).toLocaleString()}
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
