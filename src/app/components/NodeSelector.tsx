import type { NodeContext } from "@/lib/domain";
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
import { eventsStatus, nodeMainHealthz, nodeMainReadyz } from "@/lib/commands";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleMinus,
  Loader2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function NodeSelector({
  contexts,
  activeNodeId,
  onPick,
}: {
  contexts: NodeContext[];
  activeNodeId: string | null;
  onPick: (nodeId: string) => void;
}) {
  const active = activeNodeId
    ? contexts.find((c) => c.node_id === activeNodeId) ?? null
    : null;
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
          variant="outline"
          size="sm"
          className="max-w-[560px] justify-between gap-2"
        >
          <span className="max-w-[220px] truncate font-mono text-xs">
            {active ? active.display_name : "No active node"}
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
        <DropdownMenuLabel>Active Node</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {contexts.length === 0 ? (
          <DropdownMenuItem disabled>No contexts yet</DropdownMenuItem>
        ) : (
          contexts.map((c) => (
            <DropdownMenuItem key={c.node_id} onClick={() => onPick(c.node_id)}>
              <div className="min-w-0">
                <div className="truncate text-sm">{c.display_name}</div>
                <div className="truncate font-mono text-xs ui-muted">
                  {c.main_api_base_url}
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
