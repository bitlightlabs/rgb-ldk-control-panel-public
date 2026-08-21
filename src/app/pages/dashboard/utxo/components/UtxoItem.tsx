import { useState } from "react";
import AssetAvatar from "@/app/components/AssetAvatar";
import CopyText from "@/app/components/CopyText";
import { Button } from "@/components/ui/button";
import type { RgbUtxoDto } from "@/lib/sdk/generated-types";
import { formatNumber } from "@/lib/number";
import { formatAddress } from "@/lib/utils";
import type { RgbContractDto, RgbUtxosMergeStatusResponse } from "@/lib/sdk/types";
import { Badge } from "@/components/ui/badge";
import IconDot from "@/app/icons/dot";
import UtxoAddBalanceDialog from "@/app/components/UtxoAddBalanceDialog";
import UnlockUtxoDialog from "@/app/components/UnlockUtxoDialog";
import CustomTooltip from "@/app/components/CustomTooltip";
import { Separator } from "@/components/ui/separator";

interface IProps {
  utxo: RgbUtxoDto
  contracts: RgbContractDto[]
  mergeStatusData?: RgbUtxosMergeStatusResponse
  onRefreshUtxoList: () => void
}
export default function UtxoItem(props: IProps) {
  const { utxo, contracts, mergeStatusData } = props
  const [showAddBalance, setShowAddBalance] = useState(false)
  const [showUnlockUtxo, setShowUnlockUtxo] = useState(false)

  const rgb = utxo.rgb || {};
  const allocations = rgb.allocations || []
  let locked = utxo.lock.locked
  let canUnlock = !locked && utxo.confirmation.status === 'confirmed' && allocations.length === 0
  // Can topup balance
  let canTopup = true

  // Check if the utxo is currently in a merge asset operation
  if(mergeStatusData) {
    const merges = mergeStatusData.merges || []
    for(let i=0; i < merges.length; i++) {
      if(merges[i].destination_utxo === utxo.outpoint) {
        if(!merges[i].released) {
          locked = true
          canUnlock = false
          canTopup = false
          break
        }
      }
    }
  }

  return (
    <div className="relative p-5 bg-background-3 rounded-3xl">
      <Badge
        variant={canUnlock ? "success" : "default"}
        className="group absolute right-5 top-5 py-1 px-3 gap-2"
      >
        {
          !canUnlock ? (
            <CustomTooltip className="group-hover:block w-[250px] -top-[60px]">
              UTXOs that are currently in use by a transaction cannot be unlocked.
            </CustomTooltip>
          ): null
        }
        <IconDot />
        <span>{canUnlock ? "Unlockable" : "Locked"}</span>
      </Badge>
      <div className="leading-[18px]">
        <div className="text-xs text-secondary-foreground">Available UTXO balance</div>
        <div className="mt-2 text-xs">{formatNumber(utxo.value_sats, 8)} BTC</div>
      </div>
      <Separator className="bg-background-solid my-5" />
      <div>
        <div className="leading-[18px] text-xs text-secondary-foreground">Output ID</div>
        <div className="mt-2 leading-5 text-base flex items-center gap-2">
          <span>{formatAddress(utxo.outpoint, 16)}</span>
          <CopyText className="text-secondary-foreground" text={utxo.outpoint} />
        </div>
      </div>

      {/* Bound RGB Assets */}
      {
        allocations.length > 0 ? (
          <>
            <Separator className="bg-background-solid my-5" />
            <div>
              <div className="leading-[18px] text-xs text-secondary-foreground">Bound RGB Assets</div>
              <div className="mt-2 space-y-3">
                {
                  allocations.map((rgb) => (
                    <BoundAsset
                      key={rgb.contract_id}
                      contracts={contracts}
                      amount={rgb.amount}
                      id={rgb.contract_id}
                    />
                  ))
                }
              </div>
            </div>
          </>
        ) : null
      }

      {/* Buttons  */}
      <div className="mt-5 flex gap-3">
        {
          (allocations.length === 0 && utxo.confirmation.status === 'confirmed') ? (
            <Button
              variant="destructive"
              className="rounded-full w-full"
              onClick={() => setShowUnlockUtxo(true)}
            >Unlock UTXO</Button>
          ) : null
        }
        {
          allocations.length > 0 && utxo.confirmation.status === 'confirmed' ? (
             <Button
              variant="white"
              className="rounded-full w-full"
              disabled={!canTopup}
              onClick={() => setShowAddBalance(true)}
            >Add UTXO Balance</Button>
          ) : null
        }
      </div>

      {/* Unlock utxo */}
      {
        showUnlockUtxo ? (
          <UnlockUtxoDialog
            utxo={props.utxo}
            onClose={() => setShowUnlockUtxo(false)}
            onSuccess={props.onRefreshUtxoList}
          />
        ) : null
      }

      {/* Add balance dialog */}
      {
        showAddBalance ? (
          <UtxoAddBalanceDialog
            utxo={utxo}
            onClose={() => setShowAddBalance(false)}
            onSuccess={props.onRefreshUtxoList}
          />
        ) : null
      }
    </div>
  )
}

function BoundAsset(props: { contracts: RgbContractDto[], amount: string, id: string }) {
  const current = props.contracts.find(c => c.contract_id === props.id)
  if (!current) return null

  return (
    <div
      className="flex h-5 items-center justify-between text-base"
    >
      <div className="h-full flex items-center gap-2">
        <AssetAvatar className="w-5 h-5 text-xs" name={current.name ?? ''} />
        <span>{current.name}</span>
      </div>
      <span>{formatNumber(props.amount, current.precision ?? 0)}</span>
    </div>
  )
}
