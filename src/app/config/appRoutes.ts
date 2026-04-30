import { lazy, type ComponentType } from "react";
import {
    ArrowDownLeftIcon,
    ArrowUpDownIcon,
    ArrowUpRightIcon,
    BoxIcon,
    SettingsIcon,
    WalletIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import IconLight from "../icons/light";

const DashboardPage = lazy(() =>
    import("@/app/pages/routes/DashboardPage").then((module) => ({
        default: module.DashboardPage,
    }))
);
const ReceivePage = lazy(() =>
    import("@/app/pages/flows/dashboard/ReceivePage").then((module) => ({
        default: module.ReceivePage,
    }))
);
const SendPage = lazy(() =>
    import("@/app/pages/flows/dashboard/SendPage").then((module) => ({
        default: module.SendPage,
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
// const RgbActionPage = lazy(() =>
//     import("@/app/pages/routes/RgbActionPage").then((module) => ({
//         default: module.RgbActionPage,
//     }))
// );
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
const OpenChannelPage = lazy(() =>
    import("@/app/pages/flows/channel/OpenChannel").then((module) => ({
        default: module.OpenChannel,
    }))
);
const AssetDetailPage = lazy(() =>
    import("@/app/pages/routes/AssetDetailPage").then((module) => ({
        default: module.AssetDetailPage,
    }))
);
const PeersPage = lazy(() =>
    import("@/app/pages/routes/PeersPage").then((module) => ({
        default: module.PeersPage,
    }))
);
const PeerConnectPage = lazy(() =>
    import("@/app/pages/flows/peers/connect").then((module) => ({
        default: module.PeerConnect,
    }))
);

export type AppRouteConfig = {
    id: string;
    path: string;
    label: string;
    icon: LucideIcon | ComponentType;
    component: ComponentType;
    requiresNode: boolean;
    category?: string;
    sidebar: boolean;
    parentSidebarId?: string;
    breadcrumb?: {
        icon: any,
        list: {title: string}[]
    }
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
        label: "Wallet",
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
        component: ReceivePage,
        requiresNode: true,
        sidebar: false,
        parentSidebarId: "dashboard",
        breadcrumb: {
            icon: ArrowDownLeftIcon,
            list: [
                {title: 'Wallet'},
                {title: 'Receive'}
            ]
        }
    },
    {
        id: "dashboard-send",
        path: "/dashboard/send",
        label: "Send",
        icon: ArrowUpRightIcon,
        component: SendPage,
        requiresNode: true,
        sidebar: false,
        parentSidebarId: "dashboard",
        breadcrumb: {
            icon: ArrowDownLeftIcon,
            list: [
                {title: 'Wallet'},
                {title: 'Send'}
            ]
        }
    },
    {
        id: "activities",
        path: "/activities",
        label: "Activities",
        icon: ArrowUpDownIcon,
        component: ActivitiesPage,
        requiresNode: true,
        category: "Wallet",
        sidebar: false,
        breadcrumb: {
            icon: ArrowDownLeftIcon,
            list: [
                {title: 'Wallet'},
                {title: 'Send'}
            ]
        }
    },
    // {
    //     id: "rgb-actions",
    //     path: "/rgb/actions",
    //     label: "Asset Import / Export",
    //     icon: () => null,
    //     component: RgbActionPage,
    //     requiresNode: true,
    //     category: "Wallet",
    //     sidebar: true,
    // },
    {
        id: "rgb-import",
        path: "/rgb/import",
        label: "RGB Asset",
        icon: ArrowDownLeftIcon,
        component: RgbImportPage,
        requiresNode: true,
        sidebar: false,
        parentSidebarId: "rgb-actions",
        breadcrumb: {
            icon: ArrowDownLeftIcon,
            list: [
                {title: 'Wallet'},
                {title: 'Import RGB Asset'}
            ]
        }
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
        breadcrumb: {
            icon: ArrowDownLeftIcon,
            list: [
                {title: 'Wallet'},
                {title: 'Export RGB Asset'}
            ]
        }
    },
    {
        id: "peers",
        path: "/peers",
        label: "Nodes",
        icon: BoxIcon,
        component: PeersPage,
        requiresNode: false,
        category: "Wallet",
        sidebar: true,
    },
    {
        id: "channels",
        path: "/channels",
        label: "Channels",
        icon: IconLight,
        component: ChannelsPage,
        requiresNode: true,
        category: "Wallet",
        sidebar: true,
    },
    {
        id: "channels-open",
        path: "/channels/open",
        label: "",
        icon: BoxIcon,
        component: OpenChannelPage,
        requiresNode: false,
        category: "Wallet",
        sidebar: false,
        breadcrumb: {
            icon: BoxIcon,
            list: [
                {title: 'Channels'},
                {title: 'Open Channel'}
            ]
        }
    },
    {
        id: "peers-connect",
        path: "/peers/connect",
        label: "Nodes",
        icon: BoxIcon,
        component: PeerConnectPage,
        requiresNode: false,
        category: "Wallet",
        sidebar: false,
        breadcrumb: {
            icon: BoxIcon,
            list: [
                {title: 'Nodes'},
                {title: 'Connect Node'}
            ]
        }
    },
    {
        id: "nodes",
        path: "/nodes",
        label: "Local Nodes",
        icon: BoxIcon,
        component: NodesManagePage,
        requiresNode: false,
        category: "Wallet",
        sidebar: false,
    },
    // {
    //     id: "events",
    //     path: "/events",
    //     label: "Events",
    //     icon: WrenchIcon,
    //     component: EventsPage,
    //     requiresNode: true,
    //     category: "Settings",
    //     sidebar: true,
    // },
    {
        id: "settings",
        path: "/settings",
        label: "Settings",
        icon: SettingsIcon,
        component: SettingsPage,
        requiresNode: false,
        category: "Wallet",
        sidebar: true,
    },
    {
        id: "asset-detail",
        path: "/asset/detail",
        label: "",
        icon: () => null,
        component: AssetDetailPage,
        requiresNode: false,
        category: "Wallet",
        sidebar: false,
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
