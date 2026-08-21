import { useState } from "react";
import IconTriangleDown from "@/app/icons/triangle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { formatNumber } from "@/lib/number";
import type { RgbUtxoDto } from "@/lib/sdk/generated-types";
import type { RgbContractDto } from "@/lib/sdk/types";
import { calculateUtxosAssetSum, formatAddress } from "@/lib/utils";

interface IProps {
  utxos: RgbUtxoDto[];
  contract: RgbContractDto | null;
  onChangeUtxos: (utxos: RgbUtxoDto) => void;
}
export default function MergeAssetUtxoSelect(props: IProps) {
  const { utxos, contract } = props;
  const [selectedUtxo, setSelectedUtxo] = useState<RgbUtxoDto | null>(null);

  const checkUtxo = (utxo: RgbUtxoDto) => {
    setSelectedUtxo(utxo);
    props.onChangeUtxos(utxo);
  }
  const sum = calculateUtxosAssetSum(selectedUtxo ? [selectedUtxo] : [], contract?.contract_id ?? "");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex gap-4 h-16 w-full items-center justify-between whitespace-nowrap rounded-2xl border border-input bg-background-4 px-3 py-2 text-lg data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
        >
          {
            selectedUtxo ? (
              <div>
                <div className="text-lg leading-5 text-left">
                  {formatAddress(selectedUtxo.outpoint)}
                </div>
                <div className="mt-1 text-xs text-secondary-foreground h-[18px] flex items-center gap-2">
                  <span>{formatNumber(sum.assets.toString(), contract?.precision ?? 0)} {contract?.name}</span>
                  <Separator orientation="vertical" />
                  <span>{sum.sats.toString()} sats</span>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Select destination UTXO</span>
            )
          }
          <IconTriangleDown className="text-foreground [[data-state=open]>&]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[518px]">
        <DropdownMenuGroup>
        {
          utxos.map((utxo) => {
            return (
              <Item
                key={utxo.outpoint}
                utxo={utxo}
                contract={contract}
                onSelect={checkUtxo}
              />
            )
          })
        }
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Single utxo select item
function Item(props: {
  utxo: RgbUtxoDto;
  contract: RgbContractDto | null,
  onSelect: (utxo: RgbUtxoDto) => void
}) {
  const { utxo, contract } = props;

  const check = () => {
    props.onSelect(utxo);
  }

  const sum = calculateUtxosAssetSum([utxo], contract?.contract_id ?? "");
  const assetAmount = formatNumber(sum.assets.toString(), contract?.precision ?? 0);

  return (
    <DropdownMenuItem
      className="h-[66px] px-3 py-3 flex items-center rounded-xl"
      onClick={check}
    >
      <div>
        <div className="text-base leading-5 text-left">
          {formatAddress(utxo.outpoint)}
        </div>
        <div className="mt-1 text-xs text-secondary-foreground h-[18px] flex items-center gap-2">
          <span>{assetAmount} {contract?.name}</span>
          <Separator orientation="vertical" />
          <span>{utxo.value_sats} sats</span>
        </div>
      </div>
    </DropdownMenuItem>
  )
}
