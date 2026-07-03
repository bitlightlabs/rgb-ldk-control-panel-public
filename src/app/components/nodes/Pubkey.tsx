import { useNodeMainNodeIdQuery } from "@/app/queries";
import { formatAddress } from "@/lib/utils";
import CopyText from "../CopyText";

export default function Pubkey(props: {activeNodeId: string | null}) {
  const nodeIdQuery = useNodeMainNodeIdQuery(props.activeNodeId);

  const data = nodeIdQuery.data;

  return (
    <div className="text-sm flex gap-2 items-center">
      <span>{formatAddress(data?.node_id)}</span>
      <CopyText text={data?.node_id ?? ''} className="text-secondary-foreground" />
    </div>
  )
}
