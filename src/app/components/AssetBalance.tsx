import { useNodeRgbContractBalanceQuery } from "@/app/queries";
import { formatNumber } from "@/lib/number";
import { useEffect, useRef, useState } from "react";

export default function AssetBalance(props: {
  nodeId: string,
  contractId: string,
  precision: number,
  onBalanceLoad?: (balance: string) => void
}) {
  const [balance, setBalance] = useState<string>('');
  const onBalanceLoadRef = useRef(props.onBalanceLoad);
  const balanceQuery = useNodeRgbContractBalanceQuery(
    props.nodeId,
    props.contractId,
  );

  useEffect(() => {
    onBalanceLoadRef.current = props.onBalanceLoad;
  }, [props.onBalanceLoad]);

  useEffect(() => {
    if (!balanceQuery.data) return;
    const result = formatNumber(balanceQuery.data.balance.total, props.precision);
    setBalance(result.toString());
    onBalanceLoadRef.current?.(result.toString());
  }, [balanceQuery.data, props.precision]);

  return (
    <span>{(balanceQuery.isLoading || !balance) ? '--' : balance}</span>
  )
}
