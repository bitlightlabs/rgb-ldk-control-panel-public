# GET-STARTED

This document explains how to bring up local `rgbldkd` nodes with Docker Compose, configure the control panel, and use the UI for funding, transfers, and regtest mining.

## 0) Prereqs

- Docker + Docker Compose (v2)
- Node.js + pnpm
- Rust toolchain (for `pnpm tauri dev`)

## 1) Bootstrap local nodes and contexts (regtest)

Use the provided script to set up secrets, contexts, and Docker Compose in one step:

```bash
./scripts/bootstrap-local.sh
```

What it does:

- creates secrets and data dirs under `example/`
- generates a ready-to-use `contexts.json`
- copies contexts to `.tmp/app-config/contexts.json`
- starts Docker Compose (`bitcoind`, `esplora`, two `rgbldkd` nodes)
- optionally starts `pnpm tauri dev` with the correct env vars

If you want to manage the UI manually, export these before running `pnpm tauri dev`:

```bash
export RGB_LDK_CONTROL_PANEL_CONFIG_DIR="$(pwd)/.tmp/app-config"
export RGB_LDK_CONTROL_PANEL_DATA_DIR="$(pwd)/.tmp/app-data"
```

The Docker Compose file used by the script is:

- `docker-compose.yml`

The generated contexts file is:

- `example/contexts.json`

## 3) Start the control panel UI

```bash
pnpm install
pnpm tauri dev
```

Once the app opens:

- Use the left sidebar to pick a node context.
- **Dashboard** shows node status, balances, and a **New address** button.
- **Settings** shows the path to `contexts.json` and allows you to open it.

## 4) Funding

Use the funding script to send regtest BTC to the first two nodes in `contexts.json`:

```bash
./scripts/fund-local.sh
```

Optional overrides:

- `FUND_AMOUNT_BTC=0.5` to change the amount per node
- `BITCOIND_RPC=host:port` (plus `BITCOIND_RPC_USER`/`BITCOIND_RPC_PASSWORD`)
- `BITCOIND_CONTAINER=bitcoind` to target a specific container

Then click **Sync wallet** in the UI to refresh balances.

## 5) Transfers (Lightning payments)

The **Payments** page provides BOLT11 send/receive flows:

- Create a BOLT11 invoice on the payee node.
- Send/pay it from the payer node.
- The UI can wait for completion and show payment status.

For a two-node demo, make sure:

- both nodes are **unlocked**
- they are connected and have an open channel (see **Channels** page)
- both nodes have on-chain funds

## 7) RGB Lightning flow (UI)

Use the UI to issue an RGB asset, share it with the second node, and perform an RGB LN payment:

1) On Node A, open **Payments → RGB** and issue a new asset (RGB20). Copy the `contract_id` and any export bundle if prompted.
2) On Node B, import the contract using the export bundle from Node A.
3) On Node B, create an RGB LN invoice for the asset amount you want to receive.
4) On Node A, pay the invoice.
5) Use **Payments → RGB** to verify balances on both nodes.

Make sure both nodes are unlocked and the Lightning channel is open before attempting RGB LN payments.

## 6) Mining (regtest)

Use the mining script to generate blocks:

```bash
./scripts/mine-local.sh 6
```

This mines N blocks (default 6). It supports the same `BITCOIND_RPC` and `BITCOIND_CONTAINER` overrides as `fund-local.sh`.

You can still use **Dashboard → New address** to generate a fresh address if you want to mine to a specific node address.

## Troubleshooting

- If the UI shows **No nodes configured**, confirm the `contexts.json` path and format.
- If **Lock/Unlock** is disabled, ensure `control_api_base_url` and `control_api_token_file_path` are set.
- If balances don’t move, mine blocks and click **Sync wallet**.
