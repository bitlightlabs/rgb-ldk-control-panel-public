
import { nodeRgbContractBalance } from "@/lib/commands";
import { useEffect, useState } from "react";

export default function AssetBalance(props: {
  nodeId: string,
  contractId: string,
  precision: number,
  onBalanceLoad?: (balance: string) => void
}) {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<string>('');

  const loadData = async () => {
    if(!props.nodeId || !props.contractId) return;
    console.log('load balance', props.nodeId, props.contractId)

    try {
      setLoading(true);
      const data = await nodeRgbContractBalance(props.nodeId, props.contractId);
      console.log('balance', data)
      const result = Number(data.balance.total) / (10 ** props.precision);
      setBalance(result.toString())
      setLoading(false);
      if(props.onBalanceLoad) props.onBalanceLoad(result.toString());
    } catch (e) {}
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [props.nodeId, props.contractId]);

  return (
    <span>{loading ? 'loading...' : balance}</span>
  )
}
