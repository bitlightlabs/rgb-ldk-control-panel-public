import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.svg";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import type { NodeContext } from "@/lib/domain";
import type { ReactNode } from "react";

export function TopBar({
  leftSlot,
  activeContext,
  contexts,
  onPickContext,
  rightSlot,
}: {
  leftSlot?: ReactNode;
  activeContext: NodeContext | null;
  contexts: NodeContext[];
  onPickContext: (nodeId: string) => void;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="flex h-14 items-center justify-between gap-3 border-b ui-border ui-bg px-4">
      <div className="flex min-w-0 items-center gap-3">
        {leftSlot}
        <div className="shrink-0">
          <img src={logo} alt="Bitlight Labs" className="h-8 w-auto" />
        </div>
        <div className="text-foreground/50 text-xs">v0.1.0</div>
        <div className="hidden items-center gap-2 rounded-md border ui-border ui-muted-10 px-2 py-1 text-xs md:inline-flex">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-medium">NETWORK: REGTEST</span>
        </div>
        {/* <div className="hidden items-center gap-2 rounded-md border ui-border ui-muted-10 px-2 py-1 text-xs md:inline-flex">
          <span className="font-medium" title={blockHint}>
            Current Block: {blockHeightText}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5 rounded-sm"
            aria-label="Mine 1 block"
            title="Mine 1 block"
            disabled={mineMutation.isPending}
            onClick={() => mineMutation.mutate()}
          >
            <Hammer className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5 rounded-sm"
            aria-label="Refresh block height"
            title="Refresh block height"
            disabled={blockHeightQuery.isFetching}
            onClick={() => {
              void blockHeightQuery.refetch();
            }}
          >
            <RefreshCw
              className={cn(
                "h-3 w-3",
                (blockHeightQuery.isFetching || mineMutation.isPending) &&
                  "animate-spin"
              )}
            />
          </Button>
        </div> */}
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("max-w-[350px] justify-between gap-2")}
            >
              <span className="truncate font-mono text-xs">
                {activeContext ? activeContext.display_name : "No active node"}
              </span>
              {activeContext ? (
                <Badge variant="secondary">
                  {activeContext.node_id.slice(0, 8)}
                </Badge>
              ) : null}
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
                <DropdownMenuItem
                  key={c.node_id}
                  onClick={() => onPickContext(c.node_id)}
                >
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
        {rightSlot}
      </div>
    </div>
  );
}
