import {
  BoxIcon,
  LockKeyhole,
  LogOutIcon,
  SettingsIcon,
  WalletIcon,
} from "lucide-react";
import { Collapsible } from "./components/ui/collapse";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "./components/ui/sidebar";
import { Button } from "./components/ui/button";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import IconCollapseRight from "./app/icons/collapseright";
import IconCollapseLeft from "./app/icons/collapseleft";
import IconLight from "./app/icons/light";
import { AppBreadcrumb, AppHeader } from "./app/components/AppHeader";
import { nodeLock, nodeMainStatus } from "./lib/commands";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { useContextStore } from "./app/stores/contextStore";
import { useMutation } from "@tanstack/react-query";
import { Spinner } from "./components/ui/spinner";

function AppSideBar(props: {onExit: (loading: boolean) => void}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { toggleSidebar, state } = useSidebar();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);

  const lockMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      await nodeLock(nodeId);
    },
  });

  const cancelConfirm = () => {
    setShowConfirm(false);
  };

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
      nav("/unlock", { replace: true });
    } catch (e) {} finally {
      props.onExit(false);
    }
  };

  return (
    <>
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
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <Collapsible asChild>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="h-11 px-3 py-3 text-base font-medium rounded-2xl gap-4"
                      isActive={pathname === "/dashboard"}
                      onClick={() => nav("/dashboard")}
                    >
                      <WalletIcon />
                      <span>Wallet</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </Collapsible>
                <Collapsible asChild>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="h-11 px-3 py-3 text-base font-medium rounded-2xl gap-4"
                      isActive={pathname === "/dashboard/peers"}
                      onClick={() => nav("/dashboard/peers")}
                    >
                      <BoxIcon />
                      <span>Nodes</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </Collapsible>
                <Collapsible asChild>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="h-11 px-3 py-3 text-base font-medium rounded-2xl gap-4"
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
                      className="h-11 px-3 py-3 text-base font-medium rounded-2xl gap-4"
                      isActive={pathname === "/dashboard/settings"}
                      onClick={() => nav("/dashboard/settings")}
                    >
                      <SettingsIcon />
                      <span>Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex flex-col gap-2 mb-2">
            <SidebarMenu>
              <Collapsible asChild>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-11 px-3 py-3 text-base font-medium rounded-2xl gap-4"
                    disabled={lockMutation.isPending}
                    onClick={lock}
                  >
                    <LockKeyhole />
                    <span>Lock Now</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Collapsible>
              <Collapsible asChild>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-11 px-3 py-3 text-base font-medium rounded-2xl gap-4"
                    onClick={() => setShowConfirm(true)}
                  >
                    <LogOutIcon />
                    <span>Log Out</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>

            <Button
              variant="ghost"
              className="text-base font-medium w-11 h-11 rounded-2xl ml-1"
              onClick={toggleSidebar}
            >
              {state === "collapsed" ? (
                <IconCollapseRight style={{ width: "20px", height: "20px" }} />
              ) : (
                <IconCollapseLeft style={{ width: "20px", height: "20px" }} />
              )}
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Logout Dialog */}
      <Dialog open={showConfirm} onOpenChange={cancelConfirm}>
        <DialogContent className="w-[400px]">
          <DialogHeader>
            <DialogTitle>Log Out?</DialogTitle>
          </DialogHeader>
          <div className="text-base">
            <div>
              Logging out will disconnect your current session from the RGB
              Lightning Node.
            </div>
            <div className="mt-3">
              Please ensure all operations are completed and data is saved.
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="rounded-full flex-1"
              onClick={cancelConfirm}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="error"
              size="lg"
              className="rounded-full flex-1"
              disabled={lockMutation.isPending}
              loading={lockMutation.isPending}
              onClick={logout}
            >
              Confirm Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Layout() {
  const [showMask, setShowMask] = useState(false);
  const [checking, setChecking] = useState(true);
  const nav = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const currentContext = useContextStore((s) => s.currentContext);

  const checkLock = async () => {
    if (!currentContext) {
      nav("/", { replace: true });
      return;
    }

    try {
      const status = await nodeMainStatus(currentContext.node_id);
      if (status.locked) {
        nav("/unlock", { replace: true });
        return;
      }

      setChecking(false);
    } catch (e) {}
  };

  useEffect(() => {
    checkLock();
  }, []);

  if (checking) {
    return null;
  }

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

function FullMask() {
  return (
    <div className="absolute inset-0 z-1000 bg-background/70 flex justify-center items-center">
      <Spinner style={{width: '28px', height: '28px'}} />
    </div>
  )
}
