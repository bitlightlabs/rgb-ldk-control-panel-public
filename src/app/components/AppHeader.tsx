import { NodeSelector } from "@/app/components/NodeSelector";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { NodeContext } from "@/lib/domain";

function networkFromNodeId(nodeId: string | null): string {
  if (!nodeId) return "UNKNOWN";
  const m = nodeId.match(/^node-(mainnet|testnet4|testnet|regtest)-/i);
  return m ? m[1].toUpperCase() : "UNKNOWN";
}

export function AppHeader({
  activeLabel,
  contexts,
  activeNodeId,
  onPickNode,
}: {
  activeLabel: string;
  contexts: NodeContext[];
  activeNodeId: string | null;
  onPickNode: (nodeId: string | null) => void;
}) {
  const activeContext =
    contexts.find((c) => c.node_id === activeNodeId) ?? null;
  const networkText = networkFromNodeId(activeContext?.node_id ?? null);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-gradient-to-b from-background/95 via-background/85 to-background/70 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-lg">{activeLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-md border ui-border ui-muted-10 px-2 py-2 text-xs md:inline-flex">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-medium">NETWORK: {networkText}</span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <NodeSelector
          contexts={contexts}
          activeNodeId={activeNodeId}
          onPick={onPickNode}
        />
      </div>
    </header>
  );
}
