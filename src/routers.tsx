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
    lazy: () => import("@/app/components/DashboardGuard").then((mod) => ({ Component: mod.default })),
    children: [
      {
        lazy: () => import('./Layout').then((mod) => ({ Component: mod.default })),
        children: [
          {
            index: true,
            lazy: () => import('./app/pages/dashboard/index').then((mod) => ({ Component: mod.DashboardPage }))
          },
          {
            path: 'receive',
            breadcrumb: [
              { title: 'Wallet', link: '/dashboard' },
              { title: 'Receive', link: '#' }
            ],
            children: [
              {
                index: true,
                lazy: () => import("@/app/pages/dashboard/receive").then((mod) => ({ Component: mod.ReceivePage }))
              },
              {
                path: 'rgb-invoice',
                breadcrumb: [
                  { title: 'Wallet', link: '/dashboard' },
                  { title: 'Receive', link: '/dashboard/receive' },
                  { title: 'RGB Lightning', link: '#' }
                ],
                lazy: () => import("@/app/pages/dashboard/receive/rgb-invoice/index").then((mod) => ({ Component: mod.RGBInvoice }))
              },
              {
                path: 'rgb-invoice-result',
                breadcrumb: [
                  { title: 'Wallet', link: '/dashboard' },
                  { title: 'Receive', link: '/dashboard/receive' },
                  { title: 'RGB Lightning', link: '#' }
                ],
                lazy: () => import("@/app/pages/dashboard/receive/rgb-invoice/result").then((mod) => ({ Component: mod.RGBInvoiceResult }))
              },
              {
                path: 'btc-bolt11-invoice',
                breadcrumb: [
                  { title: 'Wallet', link: '/dashboard' },
                  { title: 'Receive', link: '/dashboard/receive' },
                  { title: 'Lightning Invoice', link: '#' }
                ],
                lazy: () => import("@/app/pages/dashboard/receive/btc-bolt11-invoice/index").then((mod) => ({ Component: mod.BtcBolt11Invoice }))
              },
              {
                path: 'btc-bolt11-invoice-result',
                breadcrumb: [
                  { title: 'Wallet', link: '/dashboard' },
                  { title: 'Receive', link: '/dashboard/receive' },
                  { title: 'Lightning Invoice', link: '#' }
                ],
                lazy: () => import("@/app/pages/dashboard/receive/btc-bolt11-invoice/result").then((mod) => ({ Component: mod.default }))
              },
              {
                path: 'btc-bolt12-offer',
                breadcrumb: [
                  { title: 'Wallet', link: '/dashboard' },
                  { title: 'Receive', link: '/dashboard/receive' },
                  { title: 'Lightning Offer', link: '#' }
                ],
                lazy: () => import("@/app/pages/dashboard/receive/btc-bolt12-offer/index").then((mod) => ({ Component: mod.default }))
              },
              {
                path: 'btc-bolt12-offer-result',
                breadcrumb: [
                  { title: 'Wallet', link: '/dashboard' },
                  { title: 'Receive', link: '/dashboard/receive' },
                  { title: 'Lightning Offer', link: '#' }
                ],
                lazy: () => import("@/app/pages/dashboard/receive/btc-bolt12-offer/result").then((mod) => ({ Component: mod.default }))
              },
              {
                path: 'btc-onchain-address',
                breadcrumb: [
                  { title: 'Wallet', link: '/dashboard' },
                  { title: 'Receive', link: '/dashboard/receive' },
                  { title: 'Bitcoin On-chain', link: '#' }
                ],
                lazy: () => import("@/app/pages/dashboard/receive/btc-onchain/index").then((mod) => ({ Component: mod.default }))
              }
            ],
          },
          {
            path: 'send',
            breadcrumb: [
              { title: 'Wallet', link: '/dashboard' },
              { title: 'Send', link: '#' }
            ],
            children: [
              {
                index: true,
                lazy: () => import("@/app/pages/dashboard/send").then((mod) => ({ Component: mod.default }))
              },
              {
                path: 'rgb-invoice',
                breadcrumb: [
                  { title: 'Wallet', link: '/dashboard' },
                  { title: 'Send', link: '/dashboard/send' },
                  { title: 'RGB', link: '#' }
                ],
                lazy: () => import("@/app/pages/dashboard/send/rgb-invoice/index").then((mod) => ({ Component: mod.default }))
              },
              {
                path: 'btc-bolt11-invoice',
                breadcrumb: [
                  { title: 'Wallet', link: '/dashboard' },
                  { title: 'Send', link: '/dashboard/send' },
                  { title: 'Lightning Invoice', link: '#' }
                ],
                lazy: () => import("@/app/pages/dashboard/send/btc-bolt11-invoice/index").then((mod) => ({ Component: mod.default }))
              },
              {
                path: 'btc-bolt12-offer',
                breadcrumb: [
                  { title: 'Wallet', link: '/dashboard' },
                  { title: 'Send', link: '/dashboard/send' },
                  { title: 'Lightning Offer', link: '#' }
                ],
                lazy: () => import("@/app/pages/dashboard/send/btc-bolt12-offer/index").then((mod) => ({ Component: mod.default }))
              },
              {
                path: 'success',
                breadcrumb: [
                  { title: 'Wallet', link: '/dashboard' },
                  { title: 'Send', link: '/dashboard/send' },
                  { title: 'Success', link: '#' }
                ],
                lazy: () => import("@/app/pages/dashboard/send/success").then((mod) => ({ Component: mod.default }))
              }
            ]
          },
          {
            path: 'utxo',
            breadcrumb: [
              { title: 'Wallet', link: '/dashboard' },
              { title: 'UTXO', link: '#' }
            ],
            lazy: () => import("@/app/pages/dashboard/utxo/index").then((mod) => ({ Component: mod.default }))
          },
          {
            path: 'activities',
            breadcrumb: [
              { title: 'Wallet', link: '/dashboard' },
              { title: 'Activities', link: '#' }
            ],
            lazy: () => import("@/app/pages/dashboard/activities/index").then((mod) => ({ Component: mod.default }))
          },
          {
            path: 'rgb',
            children: [
              {
                path: 'import',
                breadcrumb: [
                  { title: 'Wallet', link: '/dashboard' },
                  { title: 'Import', link: '/dashboard/rgb/import' },
                ],
                lazy: () => import("@/app/pages/dashboard/import-asset/index").then((mod) => ({ Component: mod.default }))
              },
              {
                path: 'export',
                breadcrumb: [
                  { title: 'Wallet', link: '/dashboard' },
                  { title: 'Export', link: '/dashboard/rgb/export' },
                ],
                lazy: () => import("@/app/pages/dashboard/export-asset/index").then((mod) => ({ Component: mod.default }))
              }
            ]
          },
          {
            path: 'asset-detail',
            breadcrumb: [
              { title: 'Wallet', link: '/dashboard' },
              { title: 'Asset Detail', link: '#' },
            ],
            lazy: () => import("@/app/pages/dashboard/asset-detail/index").then((mod) => ({ Component: mod.default }))
          },

          // Side menu
          {
            path: 'peers',
            children: [
              {
                index: true,
                lazy: () => import("@/app/pages/nodes/index").then((mod) => ({ Component: mod.default }))
              },
              {
                path: 'connect',
                breadcrumb: [
                  { title: 'Nodes', link: '/dashboard/peers' },
                  { title: 'Connect', link: '#' }
                ],
                lazy: () => import("@/app/pages/nodes/connect/index").then((mod) => ({ Component: mod.default }))
              }
            ]
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
                breadcrumb: [
                  { title: 'Channels', link: '/dashboard/channels' },
                  { title: 'Open Channel', link: '#' }
                ],
                lazy: () => import("@/app/pages/channels/open-channel/index").then((mod) => ({ Component: mod.default }))
              },
            ],
          },
          {
            path: 'settings',
            lazy: () => import("@/app/pages/settings/index").then((mod) => ({ Component: mod.default }))
          },
          {
            path: 'swap',
            children: [
              {
                index: true,
                lazy: () => import("@/app/pages/swap/index").then((mod) => ({ Component: mod.default }))
              },
              {
                path: 'accept',
                breadcrumb: [
                  { title: 'Swap', link: '/dashboard/swap' },
                  { title: 'Accept', link: '#' }
                ],
                lazy: () => import("@/app/pages/swap/accept/index").then((mod) => ({ Component: mod.default }))
              }
            ],

          }
        ],
      }
    ]
  },
  {
    path: "*",
    lazy: () => import("@/app/pages/not-found").then((mod) => ({ Component: mod.default })),
  },
]

export const routes = createBrowserRouter(routesConfig);
