import { useNodeMainBalancesQuery } from "@/app/queries";
import { useEffect, useRef, useState } from "react";

export default function WalletBtcBalance(props: {nodeId: string, onBalanceLoad?: (balance: string) => void}) {
  const [balance, setBalance] = useState<string>('');
  const onBalanceLoadRef = useRef(props.onBalanceLoad);
  const balancesQuery = useNodeMainBalancesQuery(props.nodeId);

  useEffect(() => {
    onBalanceLoadRef.current = props.onBalanceLoad;
  }, [props.onBalanceLoad]);

  useEffect(() => {
    if (!balancesQuery.data) return;
    const result = BigInt(balancesQuery.data.btc.onchain_spendable_sats);
    setBalance(result.toString());
    onBalanceLoadRef.current?.(result.toString());
  }, [balancesQuery.data]);

  return (
    <span>{(balancesQuery.isLoading || !balance) ? '--' : (balance + ' sats')}</span>
  )
}
