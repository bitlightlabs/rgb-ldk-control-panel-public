import { NodeSelector } from "@/app/components/NodeSelector";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { NodeContext } from "@/lib/domain";

export function AppHeader({
  activeLabel,
  contexts,
  activeNodeId,
  onPickNode,
  breadcrumb,
}: {
  activeLabel: string;
  contexts: NodeContext[];
  activeNodeId: string | null;
  onPickNode: (nodeId: string | null) => void;
  breadcrumb?: {
    icon: any,
    list: {title: string}[]
  }
}) {
  const node = contexts.find((c) => c.node_id === activeNodeId);
  const network = node?.network;

  const list = breadcrumb?.list ?? [];
  const menu = []
  for(let i=0; i<list.length; i++) {
    menu.push(
      <BreadcrumbItem key={list[i].title}>
        <BreadcrumbPage>
          {list[i].title}
        </BreadcrumbPage>
      </BreadcrumbItem>
    )
    if(i < list.length - 1) {
      menu.push(<BreadcrumbSeparator key={`sep-${i}`} />)
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-[68px] shrink-0 items-center justify-between gap-2 bg-gradient-to-b from-background/95 via-background/85 to-background/70 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center">
        {
          breadcrumb ? (
            <Breadcrumb>
              <BreadcrumbList>
                {menu}
              </BreadcrumbList>
            </Breadcrumb>
          ) : <h2 className="text-xl font-bold">{activeLabel}</h2>
        }
      </div>

      {
        breadcrumb ? null : (
          <div className="h-9 flex items-center gap-2">
            <div className="h-9 items-center gap-2 rounded-full px-2.5 text-sm inline-flex bg-background-2">
              <span className="relative inline-flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
              </span>
              <span className="text-sm">{network?.toUpperCase()}</span>
            </div>

            <NodeSelector
              contexts={contexts}
              activeNodeId={activeNodeId}
              onPick={onPickNode}
            />
          </div>
        )
      }
    </header>
  );
}
