import { nodeRgbUtxos } from "@/lib/commands";
import type { RgbUtxoDto } from "@/lib/sdk/generated-types";
import { useEffect, useState } from "react";

interface IProps {
  nodeId: string;
  contractId: string;
  onBalance?: (sats: string) => void;
}

/**
 * NOTE: Only return the largest UTXO balance
 */
export default function RgbUtxoBalance(props: IProps) {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState('');

  const findUtxo = async () => {
    if(!props.nodeId || !props.contractId) return

    try {
      setLoading(true)

      // 1. Fetch all RGB UTXOs
      const all = await nodeRgbUtxos(props.nodeId);

      // 2. Find the UTXOs that matches the contract ID
      let utxos: RgbUtxoDto[] = []
      const list = all.utxos
      for(let i=0; i<list.length; i++) {
        const assets = list[i].rgb.allocations
        if(assets && assets.length > 0) {
          for(let j=0; j<assets.length; j++) {
            if(assets[j].contract_id === props.contractId) {
              utxos.push(list[i])
            }
          }
        }
      }

      // 3. Find the largest UTXO
      if(utxos.length > 0) {
        utxos.sort((a, b) => BigInt(b.value_sats) - BigInt(a.value_sats) >= 0n ? 1 : -1)

        setBalance(utxos[0].value_sats)
        if(props.onBalance) {
          props.onBalance(utxos[0].value_sats)
        }
      }
    } catch(e) {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    findUtxo()
  }, [props.nodeId, props.contractId])

  return (
    <span>{loading ? 'loading...' : (balance + ' sats')}</span>
  )
}
