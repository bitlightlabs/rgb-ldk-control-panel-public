import CopyText from "@/app/components/CopyText";
import { Badge } from "@/components/ui/badge";
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
  eventsStatus,
  nodeMainHealthz,
  nodeMainNodeId,
  nodeMainReadyz,
} from "@/lib/commands";
import { cn, formatAddress } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleMinus,
  Loader2,
  Plus,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useContextStore } from "../stores/contextStore";

export function NodeSelector() {
  const nav = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);

  const activeNodeId = currentContext?.node_id ?? '';

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
  const eventsStatusQuery = useQuery({
    queryKey: ["node_selector_events_status", activeNodeId],
    queryFn: () => eventsStatus(activeNodeId!),
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

  const evtBadge: StatusBadge = !activeNodeId
    ? { label: "EVT OFF", variant: "secondary", Icon: CircleMinus }
    : eventsStatusQuery.data?.running
    ? { label: "EVT", variant: "success", Icon: Activity }
    : { label: "EVT OFF", variant: "warning", Icon: AlertTriangle };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="destructive"
          className="h-9 justify-between gap-2 rounded-full"
        >
          <span className="max-w-[220px] truncate font-mono text-xs">
            {currentContext ? currentContext.display_name : "No active node"}
          </span>
          <Badge variant={upBadge.variant} className="gap-1">
            <upBadge.Icon
              className={cn("h-3 w-3", upBadge.spin ? "animate-spin" : "")}
            />
            <span className="text-[10px] font-normal"> {upBadge.label}</span>
          </Badge>
          <Badge variant={readyBadge.variant} className="gap-1">
            <readyBadge.Icon
              className={cn("h-3 w-3", readyBadge.spin ? "animate-spin" : "")}
            />
            <span className="text-[10px] font-normal"> {readyBadge.label}</span>
          </Badge>
          <Badge variant={evtBadge.variant} className="gap-1">
            <evtBadge.Icon className="h-3 w-3" />
            <span className="text-[10px] font-normal"> {evtBadge.label}</span>
          </Badge>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px]">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <div className="text-sm">Active Node</div>
            <button
              type="button"
              className="text-xs text-accent-foreground hover:text-foreground transition-colors"
              // onClick={() => openInitialSetup()}
              onClick={() => nav('/')}
            >
              <Plus className="mr-1 inline h-3 w-3" />
              <span>create new node</span>
            </button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {currentContext === null ? (
          <DropdownMenuItem disabled>No contexts yet</DropdownMenuItem>
        ) : (
          <DropdownMenuItem>
            <div className="flex w-full min-w-0 flex-col gap-1.5">
              <div className="truncate text-sm">{currentContext.display_name}</div>
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-xs opacity-70">Pubkey:</span>
                <span className="truncate font-mono text-xs opacity-60">
                  {formatAddress(nodeIdQuery.data?.node_id)}
                </span>
                <CopyText
                  text={nodeIdQuery.data?.node_id ?? ''}
                  className="shrink-0 text-secondary-foreground"
                />
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-xs opacity-70">
                  Address:
                </span>
                <span className="truncate font-mono text-xs opacity-60">
                  {formatAddress(currentContext.p2p_listen ?? '')}
                </span>
                <CopyText
                  text={currentContext.p2p_listen ?? ''}
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
