import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { SidebarCategoryConfig } from "@/app/config/appRoutes";
import { Button } from "@/components/ui/button";
import IconCollapseLeft from "../icons/collapseleft";
import { Collapsible } from "@/components/ui/collapse";
import IconCollapseRight from "../icons/collapseright";
import type { NodeContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
// import WindowAction from "./WindowAction";

// interface SidebarItem {
//   id: string;
//   label: string;
//   icon: LucideIcon;
//   path: string;
// }

interface AppSidebarProps {
  items: SidebarCategoryConfig[];
  activeItemId: string;
  onNavigate: (path: string) => void;
  contexts: NodeContext[];
  activeNodeId: string | null;
}

export function AppSidebar({
  items,
  activeItemId,
  onNavigate,
  contexts,
  activeNodeId,
}: AppSidebarProps) {
  const { toggleSidebar, state } = useSidebar();
  // const activeNode = activeNodeId
  //   ? contexts.find((context) => context.node_id === activeNodeId) ?? null
  //   : null;

  // const healthzQuery = useQuery({
  //   queryKey: ["sidebar_node_healthz", activeNodeId],
  //   queryFn: () => nodeMainHealthz(activeNodeId!),
  //   enabled: !!activeNodeId,
  //   refetchInterval: 10_000,
  //   retry: 0,
  // });

  // const nodeStatus = !activeNodeId
  //   ? "NO NODE"
  //   : healthzQuery.isSuccess && healthzQuery.data?.ok
  //   ? "ONLINE"
  //   : healthzQuery.isError
  //   ? "OFFLINE"
  //   : "CHECKING";

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center space-x-2 px-3 py-1">
          {state === "collapsed" ? (
            <img
              src="./icon.svg"
              alt="Bitlight Labs"
              style={{ width: "26px", height: "40px" }}
            />
          ) : (
            <img
              src="./logo.svg"
              alt="Bitlight Labs"
              style={{ width: "168px", height: "40px" }}
            />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="pb-4">
        {items.map((category) => (
          <SidebarGroup key={category.label}>
            {/* <SidebarGroupLabel>{category.label}</SidebarGroupLabel> */}
            <SidebarGroupContent>
              <SidebarMenu>
                {category.items.map((item) => (
                  <Collapsible key={item.id} asChild>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        className="h-11 px-3 py-3 text-base font-medium rounded-2xl gap-4"
                        isActive={activeItemId === item.id}
                        onClick={() => onNavigate(item.path)}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </Collapsible>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-2 mb-2">
          {/* <SidebarMenu>
            <Collapsible
              asChild
            >
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-11 px-3 py-3 text-base font-medium rounded-2xl gap-4"

                >
                  <LockKeyhole />
                  <span>Lock Now</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </Collapsible>
            <Collapsible
              asChild
            >
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-11 px-3 py-3 text-base font-medium rounded-2xl gap-4"

                >
                  <LogOutIcon />
                  <span>Log Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu> */}

          <Button
            variant="ghost"
            className="text-base font-medium w-11 h-11 rounded-2xl ml-1"
            onClick={toggleSidebar}
          >
            {state === "collapsed" ? (
              <IconCollapseRight style={{width: '20px', height: '20px'}} />
            ) : (
              <IconCollapseLeft style={{width: '20px', height: '20px'}} />
            )}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export { SidebarProvider } from "@/components/ui/sidebar";
