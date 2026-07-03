import { DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import type { NodeContext } from "@/lib/domain";
import { useState } from "react";
import NodeIcon from "./NodeIcon";
import { safeSubstring } from "@/lib/utils";

export default function DashboardSwitchNode(props: {
  contexts: NodeContext[],
  onSwitch: (nodeId: string) => void
}) {
  const [hasOnlineNodes, setHasOnlineNodes] = useState(false);
  const list = props.contexts;

  if(list.length === 0) {
    return null;
  }

  return (
    <>
      {hasOnlineNodes ? <DropdownMenuLabel>Switch Other Nodes</DropdownMenuLabel> : null}

      {list.map((v) => {
        return (
          <NodeItem
            key={v.node_id}
            node={v}
            onSwitch={props.onSwitch}
            onOnline={setHasOnlineNodes}
          />
        )
      })}
    </>
  )
}

function NodeItem(
  props: {
    node: NodeContext,
    onSwitch: (nodeId: string) => void
    onOnline: (online: boolean) => void
  }
) {
  const node = props.node;
  const [online, setOnline] = useState(true);

  const changeStatus = (id: string, online: boolean) => {
    setOnline(online);

    if(online) {
      props.onOnline(true);
    }
  }

  if(!online) {
    return null;
  }

  return (
    <DropdownMenuItem
      className="h-13 px-3 gap-3"
      onClick={() => props.onSwitch(node.node_id)}
    >
      <NodeIcon
        nodeId={node.node_id}
        name={node.display_name ?? ''}
        onStatusChange={changeStatus}
      />
      <div
        className="flex-1 flex flex-col"
      >
        <div className="font-medium">
          {safeSubstring(node.display_name, 9)}
        </div>
        <div className="text-2xs text-secondary-foreground">
          <span>{node.network.toUpperCase()}</span>
          <span> · </span>
          <span>Local</span>
        </div>
      </div>
    </DropdownMenuItem>
  )
}
