import CopyText from "@/app/components/CopyText";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  nodeMainHealthz,
  nodeMainNodeId,
  nodeMainReadyz,
} from "@/lib/commands";
import { cn, formatAddress } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleMinus,
  Loader2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useContextStore } from "../stores/contextStore";

export function NodeSelector() {
  const currentContext = useContextStore((s) => s.currentContext);

  const activeNodeId = currentContext?.node_id ?? "";

  const healthzQuery = useQuery({
    queryKey: ["node_selector_healthz", activeNodeId],
    queryFn: () => nodeMainHealthz(activeNodeId!),
    enabled: !!activeNodeId,
    refetchInterval: 10_000,
    retry: 0,
  });
  const readyzQuery = useQuery({
    queryKey: ["node_selector_readyz", activeNodeId],
    queryFn: () => nodeMainReadyz(activeNodeId!),
    enabled: !!activeNodeId,
    refetchInterval: 10_000,
    retry: 0,
  });
  const nodeIdQuery = useQuery({
    queryKey: ["node_main_node_id", activeNodeId],
    queryFn: () => nodeMainNodeId(activeNodeId),
    enabled: !!activeNodeId,
  });

  type StatusBadge = {
    label: string;
    variant:
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | "success"
      | "warning";
    Icon: LucideIcon;
    spin?: boolean;
  };

  const upBadge: StatusBadge = !activeNodeId
    ? { label: "—", variant: "secondary", Icon: CircleMinus }
    : healthzQuery.isSuccess && healthzQuery.data?.ok === true
    ? { label: "UP", variant: "success", Icon: CheckCircle2 }
    : healthzQuery.isError
    ? { label: "DOWN", variant: "destructive", Icon: XCircle }
    : { label: "…", variant: "secondary", Icon: Loader2, spin: true };

  const readyBadge: StatusBadge = !activeNodeId
    ? { label: "—", variant: "secondary", Icon: CircleMinus }
    : readyzQuery.isSuccess && readyzQuery.data?.ok === true
    ? { label: "READY", variant: "success", Icon: CheckCircle2 }
    : readyzQuery.isSuccess && readyzQuery.data?.ok === false
    ? { label: "NOT READY", variant: "warning", Icon: AlertTriangle }
    : readyzQuery.isError
    ? { label: "ERR", variant: "destructive", Icon: XCircle }
    : { label: "…", variant: "secondary", Icon: Loader2, spin: true };

  const networkStatus = !activeNodeId
    ? "NO NODE"
    : upBadge.label === "DOWN"
    ? "OFFLINE"
    : upBadge.label === "UP" && readyBadge.label === "READY"
    ? "ONLINE / READY"
    : upBadge.label === "UP" && readyBadge.label === "NOT READY"
    ? "ONLINE / NOT READY"
    : "CHECKING...";

  const isOnline = upBadge.label === "UP";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className="h-9 justify-between text-white gap-3 rounded-full"
        >
          <span
            className={cn(
              "shrink-0",
              isOnline
                ? "inline-flex"
                : "h-2.5 w-2.5 rounded-full bg-muted-foreground/40"
            )}
          >
            {isOnline ? (
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
            ) : null}
          </span>

          <span className="max-w-40 truncate text-[13px]">
            {currentContext ? currentContext.display_name : "No active node"}
          </span>
          <span className="text-[10px]">{networkStatus}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-90">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <div className="text-sm">Node Info</div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {currentContext === null ? (
          <DropdownMenuItem disabled>No contexts yet</DropdownMenuItem>
        ) : (
          <DropdownMenuItem className="px-3">
            <div className="flex w-full min-w-0 flex-col gap-1.5">
              <div className="truncate text-sm">
                {currentContext.display_name}
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-xs opacity-70">Pubkey:</span>
                <span className="truncate font-mono text-xs opacity-60">
                  {formatAddress(nodeIdQuery.data?.node_id)}
                </span>
                <CopyText
                  text={nodeIdQuery.data?.node_id ?? ""}
                  className="shrink-0 text-secondary-foreground"
                />
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-xs opacity-70">Address:</span>
                <span className="truncate font-mono text-xs opacity-60">
                  {formatAddress(currentContext.p2p_listen ?? "")}
                </span>
                <CopyText
                  text={currentContext.p2p_listen ?? ""}
                  className="shrink-0 text-secondary-foreground"
                />
              </div>
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
