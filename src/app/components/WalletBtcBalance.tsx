import { nodeMainBalances } from "@/lib/commands";
import { useEffect, useState } from "react";

export default function WalletBtcBalance(props: {nodeId: string, onBalanceLoad?: (balance: string) => void}) {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<string>('');

  const loadData = async () => {
    if(!props.nodeId) return;
    console.log('load balance', props.nodeId)

    try {
      setLoading(true);
      const data = await nodeMainBalances(props.nodeId);
      console.log('balance', data)
      const result = BigInt(data.btc.onchain_spendable_sats)
      setBalance(result.toString())
      setLoading(false);
      if (props.onBalanceLoad) {
        props.onBalanceLoad(result.toString());
      }
    } catch (e) {}
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [props.nodeId]);

  return (
    <span>{loading ? 'loading...' : (balance + ' sats')}</span>
    )
}
