import { getGradientStyle } from "@/lib/utils";
import { cn } from "@/lib/utils"
import IconBox from "../icons/box";
import NodeStatus from "./NodeStatus";
import { useNodeMainStatusQuery } from "@/app/queries";
import { useEffect, useState } from "react";

interface IProps {
  forceOnline?: boolean;
  name: string;
  className?: string;
  nodeId?: string;
  onStatusChange?: (nodeId: string, online: boolean) => void;
}

export default function NodeIcon({ forceOnline, name, className = '', nodeId = '', onStatusChange }: IProps) {
  const [online, setOnline] = useState(false)
  const statusQuery = useNodeMainStatusQuery(nodeId, {
    retry: false,
  });

  useEffect(() => {
    if(forceOnline === undefined) {
      return
    }
    setOnline(forceOnline)
  }, [forceOnline])

  useEffect(() => {
    if(statusQuery.isLoading) {
      return
    }

    const success = !!statusQuery.data;
    setOnline(success)
    onStatusChange?.(nodeId, success);
  }, [statusQuery.isLoading])

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
