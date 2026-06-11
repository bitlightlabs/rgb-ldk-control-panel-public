import { Collapsible } from "./components/ui/collapse";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "./components/ui/sidebar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import IconCollapseRight from "./app/icons/collapseright";
import IconCollapseLeft from "./app/icons/collapseleft";
import IconLight from "./app/icons/light";
import { AppBreadcrumb, AppHeader } from "./app/components/AppHeader";
import { contextsList, nodeLock } from "./lib/commands";
import { useState } from "react";
import { useContextStore } from "./app/stores/contextStore";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Spinner } from "./components/ui/spinner";
import LogoSmall from '@/assets/icon.svg'
import LogoLarge from '@/assets/logo.svg'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import IconPlus from "./app/icons/IconPlus";
import NodeIcon from "./app/components/NodeIcon";
import SwitchNodeDialog from "./app/pages/start/components/SwitchNodeDialog";
import LogOutTip from "./app/components/LogOutTip";
import CreateNodeTip from "./app/components/CreateNodeTip";
import IconLogout from "./app/icons/logout";
import IconLock from "./app/icons/lock";
import IconWallet from "./app/icons/wallet";
import IconBox from "./app/icons/box";
import IconSettings from "./app/icons/settings";
import { safeSubstring } from "./lib/utils";

export default function Layout() {
  const [showMask, setShowMask] = useState(false);
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      {showMask ? <FullMask /> : null}
      <AppSideBar onExit={(b) => setShowMask(b)} />
      <SidebarInset className="h-full overflow-hidden">
        {pathname === "/dashboard" ? (
          <AppHeader />
        ) : pathname === "/dashboard/peers" ||
          pathname === "/dashboard/settings" ||
          pathname === "/dashboard/channels" ? null : (
          <AppBreadcrumb />
        )}

        <main className="flex flex-col min-h-0 flex-1 overflow-y-auto pl-2 pr-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AppSideBar(props: {onExit: (loading: boolean) => void}) {
  const [showLogOutTip, setShowLogOutTip] = useState(false);
  const { toggleSidebar, state } = useSidebar();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);
  const [showSwitchNode, setShowSwitchNode] = useState('');
  const [showCreateNodeTip, setShowCreateNodeTip] = useState(false);

  const contextsQuery = useQuery({
    queryKey: ["contexts"],
    queryFn: contextsList,
    refetchInterval: false,
  });

  const lockMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      await nodeLock(nodeId);
    },
  });

  const logout = async () => {
    if (!currentContext) return;
    try {
      props.onExit(true);
      await lockMutation.mutateAsync(currentContext.node_id);
      nav("/", { replace: true });
    } catch (e) {} finally {
      props.onExit(false);
    }
  };

  const lock = async () => {
    if (!currentContext) return;
    try {
      props.onExit(true);
      await lockMutation.mutateAsync(currentContext.node_id);
      nav("/unlock?node_id=" + currentContext.node_id, { replace: true });
    } catch (e) {} finally {
      props.onExit(false);
    }
  };

  const contexts = contextsQuery.data ?? []
  const othersNode = contexts.filter((v) => v?.node_id !== currentContext?.node_id)

  return (
    <>
      <Sidebar variant="floating" collapsible="icon">
        <SidebarHeader>
          <div
            className="hidden group-hover:block absolute z-1000"
            style={{
              top: state === "collapsed" ? "24px" : "12px",
              left: state === "collapsed" ? "20px" : "auto",
              right: state === "collapsed" ? "auto" : "-6px",
              width: state === "collapsed" ? "44px" : "36px",
              height: state === "collapsed" ? "44px" : "36px",
            }}
          >
            <button
              type="button"
              className="flex items-center justify-center w-full h-full rounded-2xl bg-background-solid-2 cursor-pointer"
              onClick={toggleSidebar}
            >
              {state === "collapsed" ? (
                <IconCollapseRight style={{ width: "20px", height: "20px" }} />
              ) : (
                <IconCollapseLeft style={{ width: "20px", height: "20px" }} />
              )}
            </button>
          </div>

          <div className="flex items-center justify-center space-x-2 px-2 py-1">
            {state === "collapsed" ? (
              <img
                src={LogoSmall}
                alt="Bitlight Labs"
                style={{ width: "26px", height: "40px" }}
              />
            ) : (
              <img
                src={LogoLarge}
                alt="Bitlight Labs"
                style={{ width: "146px", height: "40px" }}
              />
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="pt-0 pb-4 ">
          <SidebarMenu>
            <Collapsible asChild>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/dashboard"}
                  onClick={() => nav("/dashboard")}
                >
                  <IconWallet />
                  <span>Wallet</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </Collapsible>
            <Collapsible asChild>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/dashboard/peers"}
                  onClick={() => nav("/dashboard/peers")}
                >
                  <IconBox />
                  <span>Nodes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </Collapsible>
            <Collapsible asChild>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/dashboard/channels"}
                  onClick={() => nav("/dashboard/channels")}
                >
                  <IconLight />
                  <span>Channels</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </Collapsible>
            <Collapsible asChild>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/dashboard/settings"}
                  onClick={() => nav("/dashboard/settings")}
                >
                  <IconSettings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <Collapsible asChild>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      className="data-[state=open]:bg-background-3 mb-1 group-data-[collapsible=icon]:!h-13"
                      size="xl"
                      style={{
                        paddingLeft: state === 'collapsed' ? '8px' : '12px',
                        paddingRight: state === 'collapsed' ? '0' : '12px',
                      }}
                    >
                      <NodeIcon
                        nodeId={currentContext?.node_id}
                        name={currentContext?.display_name ?? ''}
                      />
                      <span className="flex-1 flex flex-col">
                        <span className="font-medium">
                          {safeSubstring(currentContext?.display_name, 9)}
                        </span>
                        <span className="text-2xs text-secondary-foreground">
                          <span>{currentContext?.network.toUpperCase()}</span>
                          <span> · </span>
                          <span>Local</span>
                        </span>
                      </span>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[260px] rounded-2xl shadow-md shadow-background/60"
                    side="top"
                    align="start"
                    sideOffset={4}
                  >
                    <DropdownMenuGroup>
                      <DropdownMenuItem className="h-13 px-3 gap-3">
                        <NodeIcon
                          nodeId={currentContext?.node_id}
                          name={currentContext?.display_name ?? ''}
                        />
                        <div
                          className="flex-1 flex flex-col"
                        >
                          <div className="font-medium">
                            {safeSubstring(currentContext?.display_name, 9)}
                          </div>
                          <div className="text-2xs text-secondary-foreground">
                            <span>{currentContext?.network.toUpperCase()}</span>
                            <span> · </span>
                            <span>Local</span>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="mx-3 my-2" />

                    <DropdownMenuGroup className="space-y-2">
                      {othersNode.length > 0 ? (
                        <DropdownMenuLabel>Switch Other Nodes</DropdownMenuLabel>
                      ) : null}

                      {othersNode.map((v) => {
                        return (
                          <DropdownMenuItem
                            className="h-13 px-3 gap-3"
                            onClick={() => setShowSwitchNode(v.node_id)}
                          >
                            <NodeIcon
                              nodeId={v.node_id}
                              name={v?.display_name ?? ''}
                            />
                            <div
                              className="flex-1 flex flex-col"
                            >
                              <div className="font-medium">
                                {safeSubstring(v?.display_name, 9)}
                              </div>
                              <div className="text-2xs text-secondary-foreground">
                                <span>{v?.network.toUpperCase()}</span>
                                <span> · </span>
                                <span>Local</span>
                              </div>
                            </div>
                          </DropdownMenuItem>
                        )
                      })}

                      <DropdownMenuItem
                        className="h-11 px-3 gap-3"
                        onClick={() => setShowCreateNodeTip(true)}
                      >
                        <IconPlus />
                        <span>Create New Node</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    {
                      othersNode.length > 0 ? (
                        <DropdownMenuSeparator className="mx-3 my-2" />
                      ) : null
                    }

                    <DropdownMenuGroup className="space-y-2">
                      <DropdownMenuItem
                        className="h-11 px-3 gap-3"
                        onClick={lock}
                      >
                        <IconLock />
                        <span>Lock Now</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="h-11 px-3 gap-3"
                        onClick={() => setShowLogOutTip(true)}
                      >
                        <IconLogout />
                        <span>Log Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Logout */}
      {showLogOutTip ? (
        <LogOutTip
          loading={lockMutation.isPending}
          onOk={logout}
          onClose={() => setShowLogOutTip(false)}
        />
      ) : null}

      {/* Switch Node */}
      {showSwitchNode ? (
        <SwitchNodeDialog
          contexts={contexts}
          nodeId={showSwitchNode}
          onClose={() => setShowSwitchNode('')}
        />
      ) : null}

      {/* Create Node Tip */}
      {showCreateNodeTip ? (
        <CreateNodeTip
          onOk={() => nav('/')}
          onClose={() => setShowCreateNodeTip(false)}
        />
      ) : null}
    </>
  );
}

function FullMask() {
  return (
    <div className="absolute inset-0 z-1000 bg-background/70 flex justify-center items-center">
      <Spinner style={{width: '28px', height: '28px'}} />
    </div>
  )
}
