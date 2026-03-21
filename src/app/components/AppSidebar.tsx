import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { LucideIcon } from "lucide-react";
import logo from "@/assets/logo.svg";
import { Separator } from "@/components/ui/separator";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { SidebarCategoryConfig } from "@/app/config/appRoutes";

interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

interface AppSidebarProps {
  items: SidebarCategoryConfig[];
  activeItemId: string;
  onNavigate: (path: string) => void;
}

export function AppSidebar({
  items,
  activeItemId,
  onNavigate,
}: AppSidebarProps) {
  const openOfficialSite = () => {
    openUrl("https://bitlightlabs.com");
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center space-x-2 px-3 py-2">
          <img src={logo} alt="Bitlight Labs" className="h-10 w-auto" />
          <span className="text-xs text-muted-foreground">v0.1.0</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="pb-4">
        {items.map((category) => (
          <SidebarGroup key={category.label}>
            <SidebarGroupLabel>{category.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {category.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeItemId === item.id}
                      onClick={() => onNavigate(item.path)}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className=" text-xs text-center text-muted-foreground">
        <Separator className="w-full" />
        <div className="cursor-pointer" onClick={openOfficialSite}>
          BitlightLabs
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export { SidebarProvider } from "@/components/ui/sidebar";
