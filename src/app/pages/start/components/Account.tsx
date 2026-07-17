import CustomTooltip from "@/app/components/CustomTooltip";
import DropMenu from "@/app/components/DropMenu";
import NodeIcon from "@/app/components/NodeIcon";
import IconDelete from "@/app/icons/delete";
import type { NodeContext } from "@/lib/domain";
import { safeSubstring } from "@/lib/utils";
import { useState } from "react";
import NetworkMeta from "./NetworkMeta";
import IconStop from "@/app/icons/stop";
import { reStartLocalNode, stopLocalNode } from "@/lib/commands";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";
import IconStart from "@/app/icons/start";
import { useNodeLockMutation } from "@/app/mutations";
import { removeNodeScopedCache } from "@/app/queries";
import { useQueryClient } from "@tanstack/react-query";
import { LDK_IMAGE, LOCAL_IGNORE_NEW_IMAGE } from "@/app/config/constant";
import UpdateImage from "@/app/components/UpdateImage";

interface IProps {
  context: NodeContext;
  onSwitchNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onRefreshContexts: () => void;
}

export default function Account(props: IProps) {
  const { context } = props;
  const [showUpdate, setShowUpdate] = useState(false)
  const [online, setOnline] = useState(true)
  const [loading, setLoading] = useState(false)
  const [actions, setActions] = useState<any[]>([])
  const lockMutation = useNodeLockMutation();
  const queryClient = useQueryClient();

  const deleteAction = {
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
  }

  const startAction = {
    label: (<span>Start Node</span>),
    icon: (
      <IconStart style={{ width: "20px", height: "20px" }} />
    ),
    data: null,
    onClick: () => checkUpdate(),
  }

  const stopAction = {
    label: (<span>Stop Node</span>),
    icon: (
      <IconStop style={{ width: "20px", height: "20px" }} />
    ),
    data: null,
    onClick: () => stopNode(),
  }

  const onNodeStatusChange = (_: string, online: boolean) => {
    if(online) {
      setActions([stopAction, deleteAction])
    } else {
      setActions([startAction, deleteAction])
    }

    setOnline(online)
  }

  const checkUpdate = () => {
    const nodeId = context.node_id
    if(!nodeId) {
      return
    }

    const ignore = globalThis.localStorage.getItem(LOCAL_IGNORE_NEW_IMAGE)
    if(!ignore && context.image !== LDK_IMAGE) {
      setShowUpdate(true)
      return;
    }

    startNode()
  }

  const startNode = async () => {
    const nodeId = context.node_id
    if(!nodeId || loading) {
      return
    }

    try {
      setLoading(true)
      await reStartLocalNode(nodeId);
      onNodeStatusChange(nodeId, true)
      props.onRefreshContexts()
    } catch(e) {
      toast.error(errorToText(e))
    } finally {
      setLoading(false)
    }
  }

  const stopNode = async () => {
    const nodeId = context.node_id
    if(!nodeId || loading) {
      return
    }

    try {
      setLoading(true)
      console.log("Stopping node:", nodeId);
      await lockMutation.mutateAsync(nodeId);
      await stopLocalNode(nodeId);
      removeNodeScopedCache(queryClient, nodeId);
      onNodeStatusChange(nodeId, false)
    } catch(e) {
      toast.error(errorToText(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
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

        <div
          className="absolute right-[10px] top-[10px]"
          onClick={(e) => e.stopPropagation()}
        >
          <DropMenu
            className="w-6 h-6"
            direaction="vertical"
            variant="ghost"
            disabled={loading}
            list={actions}
          />
        </div>
        <div className="h-full items-center flex gap-3">
          <NodeIcon
            className="w-8 h-8"
            forceOnline={online}
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

      {/* Update Image */}
      {showUpdate ? (
        <UpdateImage
          nodeId={context.node_id}
          onClose={() => setShowUpdate(false)}
          onStart={startNode}
        />
      ) : null}
    </>
  )
}
