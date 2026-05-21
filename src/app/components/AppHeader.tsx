import { NodeSelector } from "@/app/components/NodeSelector";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBreadcrumbs } from "@/hooks/use-breadcrumb";
import { Wallet } from "lucide-react";
import { useContextStore } from "../stores/contextStore";

export function AppHeader() {
  const currentContext = useContextStore((s) => s.currentContext);
  const network = currentContext?.network;

  return (
    <header className="sticky top-0 z-40 flex h-[68px] shrink-0 items-center justify-between gap-2 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <h2 className="text-xl font-bold">Wallet</h2>
      <div className="h-9 flex items-center gap-2">
        <div className="h-9 items-center gap-2 rounded-full px-2.5 text-sm inline-flex bg-background-2">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          <span className="text-sm">{network?.toUpperCase()}</span>
        </div>

        <NodeSelector />
      </div>
    </header>
  );
}

export function AppBreadcrumb() {
  const breadcrumbs = useBreadcrumbs()

  const menu = []
  for(let i=0; i<breadcrumbs.length; i++) {
    menu.push(
      <BreadcrumbItem key={i}>{breadcrumbs[i]}</BreadcrumbItem>
    )
    // separator
    if(i < breadcrumbs.length - 1) {
      menu.push(
        <BreadcrumbSeparator key={`${i}-sep`} />
      )
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-[50px] shrink-0 justify-between gap-2 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="h-full flex items-center">
        {
          <Breadcrumb className="flex items-center">
            <Wallet className="mr-2 h-3 w-3 text-secondary-foreground" />
            <BreadcrumbList>
              {menu}
            </BreadcrumbList>
          </Breadcrumb>
        }
      </div>
    </header>
  )
}
