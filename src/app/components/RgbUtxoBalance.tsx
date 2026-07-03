import { useNodeRgbUtxosQuery } from "@/app/queries";
import type { RgbUtxoDto } from "@/lib/sdk/generated-types";
import { useEffect, useRef, useState } from "react";

interface IProps {
  nodeId: string;
  contractId: string;
  onBalance?: (sats: string) => void;
}

/**
 * NOTE: Only return the largest UTXO balance
 */
export default function RgbUtxoBalance(props: IProps) {
  const [balance, setBalance] = useState('');
  const onBalanceRef = useRef(props.onBalance);
  const utxosQuery = useNodeRgbUtxosQuery(props.nodeId);

  useEffect(() => {
    onBalanceRef.current = props.onBalance;
  }, [props.onBalance]);

  useEffect(() => {
    if (!props.contractId || !utxosQuery.data) return;

    const utxos: RgbUtxoDto[] = [];
    const list = utxosQuery.data.utxos;
    for (let i = 0; i < list.length; i++) {
      const assets = list[i].rgb.allocations;
      if (assets && assets.length > 0) {
        for (let j = 0; j < assets.length; j++) {
          if (assets[j].contract_id === props.contractId) {
            utxos.push(list[i]);
          }
        }
      }
    }

    if (utxos.length === 0) {
      setBalance("");
      return;
    }

    utxos.sort((a, b) =>
      BigInt(b.value_sats) - BigInt(a.value_sats) >= 0n ? 1 : -1,
    );
    setBalance(utxos[0].value_sats);
    onBalanceRef.current?.(utxos[0].value_sats);
  }, [props.contractId, utxosQuery.data]);

  return (
    <span>{utxosQuery.isLoading || !balance ? '--' : (balance + ' sats')}</span>
  )
}
