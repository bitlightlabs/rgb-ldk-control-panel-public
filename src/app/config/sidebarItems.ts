import {
  ArrowUpDownIcon,
  BoxIcon,
  Link2Icon,
  SettingsIcon,
  WalletIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { DashboardPage } from "@/app/pages/DashboardPage";
import { AssetsPage } from "@/app/pages/AssetsPage";
import { ActivitiesPage } from "@/app/pages/ActivitiesPage";
import { ChannelsPage } from "@/app/pages/ChannelsPage";
import { EventsPage } from "@/app/pages/EventsPage";
import { NodesManagePage } from "@/app/pages/NodesManagePage";
import { SettingsPage } from "@/app/pages/SettingsPage";

export type SidebarItemConfig = {
  id: string;
  label: string;
  icon: LucideIcon;
  component: ComponentType;
  requiresNode: boolean;
};

export type SidebarCategoryConfig = {
  label: string;
  items: SidebarItemConfig[];
};

export const sidebarItems: SidebarCategoryConfig[] = [
  {
    label: "Wallet",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: WalletIcon,
        component: DashboardPage,
        requiresNode: true,
      },
      {
        id: "assets",
        label: "RGB Assets",
        icon: ZapIcon,
        component: AssetsPage,
        requiresNode: true,
      },
      {
        id: "channels",
        label: "Channels",
        icon: Link2Icon,
        component: ChannelsPage,
        requiresNode: true,
      },
      {
        id: "activities",
        label: "Activities",
        icon: ArrowUpDownIcon,
        component: ActivitiesPage,
        requiresNode: true,
      },
    ],
  },
  {
    label: "Nodes Management",
    items: [
      {
        id: "nodes",
        label: "Nodes",
        icon: BoxIcon,
        component: NodesManagePage,
        requiresNode: false,
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        id: "events",
        label: "Events",
        icon: WrenchIcon,
        component: EventsPage,
        requiresNode: true,
      },
      {
        id: "settings",
        label: "Settings",
        icon: SettingsIcon,
        component: SettingsPage,
        requiresNode: false,
      },
    ],
  },
];
