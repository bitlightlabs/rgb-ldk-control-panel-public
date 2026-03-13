import { NodeSelector } from "@/app/components/NodeSelector";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
// import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
// import { regtestBlockHeight, regtestMine } from "@/lib/commands";
import type { NodeContext } from "@/lib/domain";
// import { useMutation, useQuery } from "@tanstack/react-query";
// import { Hammer } from "lucide-react";
// import { toast } from "sonner";

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
  // const blockHeightQuery = useQuery({
  //   queryKey: ["header_regtest_block_height"],
  //   queryFn: regtestBlockHeight,
  //   refetchInterval: 10_000,
  // });
  // const mineMutation = useMutation({
  //   mutationFn: () => regtestMine(20),
  //   onSuccess: async () => {
  //     await blockHeightQuery.refetch();
  //     toast.success("Mined 20 block");
  //   },
  // });
  // const blockHeightText = blockHeightQuery.isLoading
  //   ? "..."
  //   : blockHeightQuery.isError
  //   ? "N/A"
  //   : String(blockHeightQuery.data?.height ?? "N/A");

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
          <span className="font-medium">NETWORK: REGTEST</span>
          <Separator orientation="vertical" className="h-3" />
          {/* <span className="font-medium">Block: {blockHeightText}</span>
          <Button
            type="button"
            className="h-5 w-5 rounded-sm bg-sidebar cursor-pointer hover:bg-sidebar-hover data-[state=open]:bg-sidebar-hover"
            aria-label="Mine 20 blocks"
            title="Mine 20 blocks"
            disabled={mineMutation.isPending}
            onClick={() => mineMutation.mutate()}
          >
            <Hammer className="h-3 w-3" />
          </Button> */}
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
