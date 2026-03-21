import { lazy, type ComponentType } from "react";
import {
    ArrowDownLeftIcon,
    ArrowUpDownIcon,
    ArrowUpRightIcon,
    BoxIcon,
    Link2Icon,
    SettingsIcon,
    WalletIcon,
    WrenchIcon,
    ZapIcon,
    Rotate3DIcon
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const DashboardPage = lazy(() =>
    import("@/app/pages/routes/DashboardPage").then((module) => ({
        default: module.DashboardPage,
    }))
);
const ReceiveBtcPage = lazy(() =>
    import("@/app/pages/flows/dashboard/ReceiveBtcPage").then((module) => ({
        default: module.ReceiveBtcPage,
    }))
);
const SendBtcPage = lazy(() =>
    import("@/app/pages/flows/dashboard/SendBtcPage").then((module) => ({
        default: module.SendBtcPage,
    }))
);
const AssetsPage = lazy(() =>
    import("@/app/pages/routes/AssetsPage").then((module) => ({
        default: module.AssetsPage,
    }))
);
const ChannelsPage = lazy(() =>
    import("@/app/pages/routes/ChannelsPage").then((module) => ({
        default: module.ChannelsPage,
    }))
);
const ActivitiesPage = lazy(() =>
    import("@/app/pages/routes/ActivitiesPage").then((module) => ({
        default: module.ActivitiesPage,
    }))
);
const NodesManagePage = lazy(() =>
    import("@/app/pages/routes/NodesManagePage").then((module) => ({
        default: module.NodesManagePage,
    }))
);
const EventsPage = lazy(() =>
    import("@/app/pages/routes/EventsPage").then((module) => ({
        default: module.EventsPage,
    }))
);
const SettingsPage = lazy(() =>
    import("@/app/pages/routes/SettingsPage").then((module) => ({
        default: module.SettingsPage,
    }))
);
const RgbActionPage = lazy(() =>
    import("@/app/pages/routes/RgbActionPage").then((module) => ({
        default: module.RgbActionPage,
    }))
);
const RgbImportPage = lazy(() =>
    import("@/app/pages/flows/rgb/RgbImportPage").then((module) => ({
        default: module.RgbImportPage,
    }))
);
const RgbExportPage = lazy(() =>
    import("@/app/pages/flows/rgb/RgbExportPage").then((module) => ({
        default: module.RgbExportPage,
    }))
);

export type AppRouteConfig = {
    id: string;
    path: string;
    label: string;
    icon: LucideIcon;
    component: ComponentType;
    requiresNode: boolean;
    category?: string;
    sidebar: boolean;
    parentSidebarId?: string;
};

type SidebarItemConfig = Pick<AppRouteConfig, "id" | "label" | "icon" | "path">;

export type SidebarCategoryConfig = {
    label: string;
    items: SidebarItemConfig[];
};

export const appRoutes: AppRouteConfig[] = [
    {
        id: "dashboard",
        path: "/dashboard",
        label: "Dashboard",
        icon: WalletIcon,
        component: DashboardPage,
        requiresNode: true,
        category: "Wallet",
        sidebar: true,
    },
    {
        id: "dashboard-receive",
        path: "/dashboard/receive",
        label: "Receive",
        icon: ArrowDownLeftIcon,
        component: ReceiveBtcPage,
        requiresNode: true,
        sidebar: false,
        parentSidebarId: "dashboard",
    },
    {
        id: "dashboard-send",
        path: "/dashboard/send",
        label: "Send",
        icon: ArrowUpRightIcon,
        component: SendBtcPage,
        requiresNode: true,
        sidebar: false,
        parentSidebarId: "dashboard",
    },
    {
        id: "assets",
        path: "/assets",
        label: "RGB Assets",
        icon: ZapIcon,
        component: AssetsPage,
        requiresNode: true,
        category: "Wallet",
        sidebar: true,
    },
    {
        id: "rgb-actions",
        path: "/rgb/actions",
        label: "Asset Import / Export",
        icon: Rotate3DIcon,
        component: RgbActionPage,
        requiresNode: true,
        category: "Wallet",
        sidebar: true,
    },
    {
        id: "rgb-import",
        path: "/rgb/import",
        label: "RGB Asset",
        icon: ArrowDownLeftIcon,
        component: RgbImportPage,
        requiresNode: true,
        sidebar: false,
        parentSidebarId: "rgb-actions",
    },
    {
        id: "rgb-export",
        path: "/rgb/export",
        label: "RGB Asset",
        icon: ArrowUpRightIcon,
        component: RgbExportPage,
        requiresNode: true,
        sidebar: false,
        parentSidebarId: "rgb-actions",
    },
    {
        id: "channels",
        path: "/channels",
        label: "Channels",
        icon: Link2Icon,
        component: ChannelsPage,
        requiresNode: true,
        category: "Wallet",
        sidebar: true,
    },
    {
        id: "activities",
        path: "/activities",
        label: "Activities",
        icon: ArrowUpDownIcon,
        component: ActivitiesPage,
        requiresNode: true,
        category: "Wallet",
        sidebar: true,
    },
    {
        id: "nodes",
        path: "/nodes",
        label: "Nodes",
        icon: BoxIcon,
        component: NodesManagePage,
        requiresNode: false,
        category: "Nodes Management",
        sidebar: true,
    },
    {
        id: "events",
        path: "/events",
        label: "Events",
        icon: WrenchIcon,
        component: EventsPage,
        requiresNode: true,
        category: "Settings",
        sidebar: true,
    },
    {
        id: "settings",
        path: "/settings",
        label: "Settings",
        icon: SettingsIcon,
        component: SettingsPage,
        requiresNode: false,
        category: "Settings",
        sidebar: true,
    },
];

export const sidebarItems: SidebarCategoryConfig[] = appRoutes
    .filter((route) => route.sidebar && route.category)
    .reduce<SidebarCategoryConfig[]>((categories, route) => {
        const categoryLabel = route.category!;
        const category = categories.find((item) => item.label === categoryLabel);
        const sidebarItem: SidebarItemConfig = {
            id: route.id,
            label: route.label,
            icon: route.icon,
            path: route.path,
        };

        if (category) {
            category.items.push(sidebarItem);
            return categories;
        }

        categories.push({
            label: categoryLabel,
            items: [sidebarItem],
        });
        return categories;
    }, []);

export function matchActiveRoute(pathname: string): AppRouteConfig | undefined {
    const exactMatch = appRoutes.find((route) => route.path === pathname);
    if (exactMatch) {
        return exactMatch;
    }

    const prefixMatches = appRoutes.filter((route) =>
        pathname.startsWith(`${route.path}/`)
    );
    if (!prefixMatches.length) {
        return undefined;
    }

    return prefixMatches.sort((a, b) => b.path.length - a.path.length)[0];
}

export function getSidebarActiveId(pathname: string): string {
    const route = matchActiveRoute(pathname);
    if (!route) {
        return "dashboard";
    }
    return route.parentSidebarId ?? route.id;
}
