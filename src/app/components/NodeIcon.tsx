import { getGradientStyle } from "@/lib/utils";
import { cn } from "@/lib/utils"
import IconBox from "../icons/box";
import NodeStatus from "./NodeStatus";
import { nodeMainStatus } from "@/lib/commands";
import { useEffect, useState } from "react";

interface IProps {
  name: string;
  className?: string;
  nodeId?: string;
  onStatusChange?: (nodeId: string, online: boolean) => void;
}

export default function NodeIcon({ name, className = '', nodeId = '', onStatusChange }: IProps) {
  const [online, setOnline] = useState(false)

  const status = async () => {
    if(!nodeId) return
    try {
      await nodeMainStatus(nodeId)
      setOnline(true)
      onStatusChange?.(nodeId, true)
    } catch(e) {
      setOnline(false)
      onStatusChange?.(nodeId, false)
    }
  }

  useEffect(() => {
    status()
  }, [nodeId])

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 h-7 w-7 items-center justify-center rounded-full",
        className
      )}
      style={{ background: getGradientStyle(name) }}
    >
      <IconBox style={{width: '14px', height: '14px'}} />
      <NodeStatus onLine={online} />
    </div>
  );
}
