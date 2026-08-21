import type { RgbContractDto, SwapInfo } from "@/lib/sdk/types";
import AssetAvatar from "../AssetAvatar";
import { CopyTextInline } from "../CopyText";
import IconArrowRight from "@/app/icons/arrowright";
import { useEffect, useRef, useState } from "react";
import { useContextStore } from "@/app/stores/contextStore";
import { useNodeSwapInfoQuery } from "@/app/queries/swap";
import { Badge } from "@/components/ui/badge";
import SwapDetailDialog from "./SwapDetailDialog";
import { parseSwapInfo } from "@/lib/swap";

interface IProps {
  data: SwapInfo
  contracts: RgbContractDto[]
  onRefresh: () => void
}

const POLL_TIME = 10000 // 10 seconds

export default function SwapItem(props: IProps) {
  const { data, contracts } = props

  const [showDetail, setShowDetail] = useState<boolean>(false)
  const [swapStatus, setSwapStatus] = useState<string>(data.status)
  const timerRef = useRef<number>(0)
  const { currentContext } = useContextStore()
  const nodeId = currentContext?.node_id ?? ''

  const infoQuery = useNodeSwapInfoQuery(nodeId, data.payment_hash, {
    enabled: false
  })

  const contract = contracts.find((c) => c.contract_id === data.contract_id)
  const swapDetail = parseSwapInfo(data, contract)

  // Poll swap status
  const pollItem = async () => {
    try {
      clearTimeout(timerRef.current)

      const data = await infoQuery.refetch()
      const status = data.data?.status

      if(status !== 'Settled' && status !== 'Failed') {
        timerRef.current = setTimeout(() => {
          pollItem()
        }, POLL_TIME) as unknown as number
      }

      if(status && status !== swapStatus) {
        setSwapStatus(status)
      }
    } catch(e) {}
  }

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      pollItem()
    }, POLL_TIME) as unknown as number

    return () => {
      clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className="h-17 px-3 flex justify-between items-center hover:bg-background-3 rounded-2xl"
      >
        <div className="h-10 flex gap-3">
          <div className="relative h-[42px] w-[42px]">
            <AssetAvatar
              className="absolute top-0 left-0 w-[30px] h-[30px] z-10"
              name={swapDetail.fromAssetName ?? ''}
            />
            <AssetAvatar
              className="absolute right-0 bottom-0 w-[30px] h-[30px] z-20 border-1 border-background"
              name={swapDetail.toAssetName ?? ''}
            />
          </div>
          <div>
            <div className="text-base font-medium leading-5 flex items-center gap-1">
              <span>{swapDetail.fromAssetName ?? ''}</span>
              <IconArrowRight className="w-4 h-4 text-secondary-foreground" />
              <span>{swapDetail.toAssetName ?? ''}</span>
              <Badge
                className="py-0 px-1.5 h-5 ml-2 text-xs"
                variant={swapStatus === 'Settled' ? 'success' : 'default'}
              >{swapStatus}</Badge>
            </div>
            <div className="mt-1 text-xs text-secondary-foreground flex gap-2 items-center">
              <span>Payment Hash: </span>
              <CopyTextInline text={data.payment_hash} />
            </div>
          </div>
        </div>
        <div className="text-right text-base">
          <div className="text-base leading-5 font-normal">
            - {swapDetail.fromAssetAmount} {swapDetail.fromAssetUnit}
          </div>
          <div className="mt-1 text-success font-normal">
            + {swapDetail.toAssetAmount} {swapDetail.toAssetUnit}
          </div>
        </div>
      </div>

      {
        showDetail ? (
          <SwapDetailDialog
            contract={contract}
            paymentHash={data.payment_hash}
            onClose={() => setShowDetail(false)}
            onRefresh={props.onRefresh}
          />
        ) : null
      }
    </>
  )
}


