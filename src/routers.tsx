import { createBrowserRouter } from "react-router-dom";

export const routesConfig = [
  {
    path: "/",
    lazy: () => import('./app/pages/start/index').then((mod) => ({ Component: mod.default }))
  },
   {
    path: "/unlock",
    lazy: () => import('./app/pages/unlock').then((mod) => ({ Component: mod.UnlockPage }))
  },
  {
    path: "/create-wallet",
    children: [
      {
        index: true,
        lazy: () => import("@/app/pages/create-wallet/index").then((mod) => ({ Component: mod.CreateWallet }))
      },
      {
        path: 'password',
        lazy: () => import("@/app/pages/create-wallet/password").then((mod) => ({ Component: mod.CreatePassword }))
      },
      {
        path: 'setup',
        lazy: () => import("@/app/pages/create-wallet/setup").then((mod) => ({ Component: mod.default }))
      },
      {
        path: 'result',
        lazy: () => import("@/app/pages/create-wallet/result").then((mod) => ({ Component: mod.CreateResult }))
      }
    ]
  },
  {
    path: "/import-wallet",
    children: [
      {
        index: true,
        lazy: () => import("@/app/pages/import-wallet").then((mod) => ({ Component: mod.default })),
      },
      {
        path: 'import',
        lazy: () => import("@/app/pages/import-wallet/import").then((mod) => ({ Component: mod.default }))
      }
    ]
  },

  {
    path: "/dashboard",
    lazy: () => import('./Layout').then((mod) => ({ Component: mod.default })),
    children: [
      {
        index: true,
        lazy: () => import('./app/pages/dashboard/index').then((mod) => ({ Component: mod.DashboardPage }))
      },
      {
        path: 'channels',
        children: [
          {
            index: true,
            lazy: () => import("@/app/pages/channels/index").then((mod) => ({ Component: mod.default }))
          },
          {
            path: 'open',
            breadcrumb: ['Wallet', 'Open'],
            lazy: () => import("@/app/pages/channels/open-channel/index").then((mod) => ({ Component: mod.default }))
          },
        ],
      },
      {
        path: 'peers',
        children: [
          {
            index: true,
            lazy: () => import("@/app/pages/nodes/index").then((mod) => ({ Component: mod.default }))
          },
          {
            path: 'connect',
            breadcrumb: ['Wallet', 'Connect'],
            lazy: () => import("@/app/pages/nodes/connect/index").then((mod) => ({ Component: mod.default }))
          }
        ]
      },
      {
        path: 'settings',
        lazy: () => import("@/app/pages/settings/index").then((mod) => ({ Component: mod.default }))
      },
      {
        path: 'receive',
        breadcrumb: ['Wallet', 'Receive'],
        children: [
          {
            index: true,
            lazy: () => import("@/app/pages/dashboard/receive").then((mod) => ({ Component: mod.ReceivePage }))
          },
          {
            path: 'rgb-invoice',
            breadcrumb: ['Wallet', 'Receive', 'RGB Lightning'],
            lazy: () => import("@/app/pages/dashboard/receive/rgb-invoice/index").then((mod) => ({ Component: mod.RGBInvoice }))
          },
          {
            path: 'rgb-invoice-result',
            breadcrumb: ['Wallet', 'Receive', 'RGB Lightning'],
            lazy: () => import("@/app/pages/dashboard/receive/rgb-invoice/result").then((mod) => ({ Component: mod.RGBInvoiceResult }))
          },
          {
            path: 'btc-bolt11-invoice',
            breadcrumb: ['Wallet', 'Receive', 'Lightning Invoice'],
            lazy: () => import("@/app/pages/dashboard/receive/btc-bolt11-invoice/index").then((mod) => ({ Component: mod.BtcBolt11Invoice }))
          },
          {
            path: 'btc-bolt11-invoice-result',
            breadcrumb: ['Wallet', 'Receive', 'Lightning Invoice'],
            lazy: () => import("@/app/pages/dashboard/receive/btc-bolt11-invoice/result").then((mod) => ({ Component: mod.default }))
          },
          {
            path: 'btc-bolt12-offer',
            breadcrumb: ['Wallet', 'Receive', 'Lightning Offer'],
            lazy: () => import("@/app/pages/dashboard/receive/btc-bolt12-offer/index").then((mod) => ({ Component: mod.default }))
          },
          {
            path: 'btc-bolt12-offer-result',
            breadcrumb: ['Wallet', 'Receive', 'Lightning Offer'],
            lazy: () => import("@/app/pages/dashboard/receive/btc-bolt12-offer/result").then((mod) => ({ Component: mod.default }))
          },
          {
            path: 'btc-onchain-address',
            breadcrumb: ['Wallet', 'Receive', 'Bitcoin On-chain'],
            lazy: () => import("@/app/pages/dashboard/receive/btc-onchain/index").then((mod) => ({ Component: mod.default }))
          }
        ]
      },

      {
        path: 'send',
        breadcrumb: ['Wallet', 'Send'],
        children: [
          {
            index: true,
            breadcrumb: ['Wallet', 'Send'],
            lazy: () => import("@/app/pages/dashboard/send").then((mod) => ({ Component: mod.default }))
          },
          {
            path: 'rgb-invoice',
            breadcrumb: ['Wallet', 'Send', 'RGB'],
            lazy: () => import("@/app/pages/dashboard/send/rgb-invoice/index").then((mod) => ({ Component: mod.default }))
          },
          {
            path: 'btc-bolt11-invoice',
            breadcrumb: ['Wallet', 'Send', 'Lightning Invoice'],
            lazy: () => import("@/app/pages/dashboard/send/btc-bolt11-invoice/index").then((mod) => ({ Component: mod.default }))
          },
          {
            path: 'btc-bolt12-offer',
            breadcrumb: ['Wallet', 'Send', 'Lightning Offer'],
            lazy: () => import("@/app/pages/dashboard/send/btc-bolt12-offer/index").then((mod) => ({ Component: mod.default }))
          },
          {
            path: 'success',
            breadcrumb: ['Wallet', 'Send', 'RGB'],
            lazy: () => import("@/app/pages/dashboard/send/success").then((mod) => ({ Component: mod.default }))
          }
        ]
      },
      {
        path: 'utxo',
        breadcrumb: ['Wallet', 'UTXO'],
        lazy: () => import("@/app/pages/dashboard/utxo/index").then((mod) => ({ Component: mod.default }))
      },
      {
        path: 'activities',
        breadcrumb: ['Wallet', 'Activities'],
        lazy: () => import("@/app/pages/dashboard/activities/index").then((mod) => ({ Component: mod.default }))
      },
      {
        path: 'rgb',
        children: [
          {
            path: 'import',
            breadcrumb: ['Wallet', 'Import'],
            lazy: () => import("@/app/pages/dashboard/import-asset/index").then((mod) => ({ Component: mod.default }))
          },
          {
            path: 'export',
            breadcrumb: ['Wallet', 'Export'],
            lazy: () => import("@/app/pages/dashboard/export-asset/index").then((mod) => ({ Component: mod.default }))
          }
        ]
      },
      {
        path: 'asset-detail',
        breadcrumb: ['Wallet', 'Asset Detail'],
        lazy: () => import("@/app/pages/routes/AssetDetailPage").then((mod) => ({ Component: mod.AssetDetailPage }))
      }
    ]
  },
]

export const routes = createBrowserRouter(routesConfig);

