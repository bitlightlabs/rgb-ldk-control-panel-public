import CustomTooltip from "@/app/components/CustomTooltip";
import DropMenu from "@/app/components/DropMenu";
import NodeIcon from "@/app/components/NodeIcon";
import IconDelete from "@/app/icons/delete";
import type { NodeContext } from "@/lib/domain";
import { safeSubstring } from "@/lib/utils";
import { useState } from "react";
import NetworkMeta from "./NetworkMeta";

interface IProps {
  context: NodeContext;
  onSwitchNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
}

export default function Account(props: IProps) {
  const { context } = props;

  const [online, setOnline] = useState(true)

  const onNodeStatusChange = (_: string, online: boolean) => {
    setOnline(online)
  }

  return (
    <div
      className="group relative h-18 mb-2 p-3 bg-background-3 rounded-2xl cursor-pointer hover:bg-background-2"
      role="button"
      onClick={() => props.onSwitchNode(context.node_id)}
    >
      {
        !online ? (
          <CustomTooltip className="hidden group-hover:block">
            Node offline. Ensure Docker
            is running to connect.
          </CustomTooltip>
        ) : null
      }

      <div className="absolute right-[10px] top-[10px]">
        <DropMenu
          className="w-6 h-6"
          direaction="vertical"
          variant="ghost"
          list={[
            {
              label: (
                <span className="text-error">Delete Node</span>
              ),
              icon: (
                <IconDelete
                  className="text-error"
                  style={{ width: "20px", height: "20px" }}
                />
              ),
              data: context.node_id,
              onClick: (id: string) => props.onDeleteNode(id),
            },
          ]}
        />
      </div>
      <div className="h-full items-center flex gap-3">
        <NodeIcon
          className="w-8 h-8"
          nodeId={context.node_id}
          name={context?.display_name ?? ''}
          onStatusChange={onNodeStatusChange}
        />
        <div>
          <h4 className="text-base font-medium truncate pr-8">
            {safeSubstring(context.display_name, 9)}
          </h4>
          <NetworkMeta
            network={context.network}
            // todo ====== nodecontext add network type ======
            type={"Local"}
          />
        </div>
      </div>
    </div>
  )
}
