import { nodeMainNodeId } from "@/lib/commands";
import { formatAddress } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import CopyText from "../CopyText";

export default function Pubkey(props: {activeNodeId: string | null}) {
  const nodeIdQuery = useQuery({
    queryKey: ["node_main_node_id", props.activeNodeId],
    queryFn: () => nodeMainNodeId(props.activeNodeId!),
    enabled: !!props.activeNodeId,
  });

  const data = nodeIdQuery.data;

  return (
    <div className="text-sm flex gap-2 items-center">
      <span>{formatAddress(data?.node_id)}</span>
      <CopyText text={data?.node_id ?? ''} className="text-secondary-foreground" />
    </div>
  )
}
