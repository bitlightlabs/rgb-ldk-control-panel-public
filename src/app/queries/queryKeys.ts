/**
 * Centralized query-key factory for the whole app.
 *
 * Every query hook under `src/app/queries` must read its key from here, and
 * every mutation hook that invalidates cache must reference the same key so
 * the two sides never drift apart.
 *
 * Convention: each factory is a function that returns a readonly tuple. The
 * first element is the domain-scoped string prefix; subsequent elements are
 * the parameters that distinguish instances (usually `nodeId`).
 */
export const queryKeys = {
  // ---- top-level (no params) ----
  contexts: () => ["contexts"] as const,
  contextsPath: () => ["contexts_path"] as const,
  logsPath: () => ["logs_path"] as const,
  dockerEnvironment: () => ["docker_environment"] as const,
  eventsHttpDebug: () => ["events_http_debug"] as const,
  walletRecommendedFees: (rpc: string) =>
    ["wallet_recommended_fees", rpc] as const,

  // ---- per-node main daemon ----
  nodeStatus: (nodeId: string) => ["node_status", nodeId] as const,
  nodeHealthz: (nodeId: string) => ["node_healthz", nodeId] as const,
  nodeReadyz: (nodeId: string) => ["node_readyz", nodeId] as const,
  nodeId: (nodeId: string) => ["node_id", nodeId] as const,
  nodeVersion: (nodeId: string) => ["node_version", nodeId] as const,
  nodeListeningAddresses: (nodeId: string) =>
    ["node_listening_addresses", nodeId] as const,
  nodeControlStatus: (nodeId: string) => ["node_control_status", nodeId] as const,
  nodeBalances: (nodeId: string) => ["node_balances", nodeId] as const,
  nodeWalletAddressCurrent: (nodeId: string) =>
    ["node_wallet_address_current", nodeId] as const,
  nodeChannels: (nodeId: string) => ["node_channels", nodeId] as const,
  nodePeers: (nodeId: string) => ["node_peers", nodeId] as const,
  nodePayments: (nodeId: string) => ["node_payments", nodeId] as const,

  // ---- RGB ----
  /** nodeRgbContracts — pure read */
  rgbContracts: (nodeId: string) => ["rgb_contracts", nodeId] as const,
  rgbContractBalance: (nodeId: string, contractId: string) =>
    ["rgb_contract_balance", nodeId, contractId] as const,
  /** nodeRgbSync then nodeRgbContracts — refresh-then-read */
  rgbContractsSynced: (nodeId: string) =>
    ["rgb_contracts_synced", nodeId] as const,
  rgbIssuers: (nodeId: string) => ["rgb_issuers", nodeId] as const,
  /** scope is a caller-chosen discriminator so different uses don't collide */
  rgbOnchainPaymentsAll: (nodeId: string) =>
    ["rgb_onchain_payments", nodeId] as const,
  rgbOnchainPayments: (nodeId: string, scope?: string) =>
    ["rgb_onchain_payments", nodeId, scope] as const,
  rgbUtxos: (nodeId: string, refresh = true) =>
    ["rgb_utxos", nodeId, refresh] as const,

  /** sensitive — only fetched on explicit refetch */
  mnemonic: (nodeId: string) => ["mnemonic", nodeId] as const,

  // ---- events ----
  eventsListAll: (nodeId: string) => ["events_list", nodeId] as const,
  eventsList: (nodeId: string, limit?: number) =>
    ["events_list", nodeId, limit] as const,
  eventsStatus: (nodeId: string) => ["events_status", nodeId] as const,

  // ---- decoders (payload-string keyed) ----
  bolt11Decode: (nodeId: string, payload: string) =>
    ["bolt11_decode", nodeId, payload] as const,
  bolt12OfferDecode: (nodeId: string, payload: string) =>
    ["bolt12_offer_decode", nodeId, payload] as const,
  bolt12RefundDecode: (nodeId: string, payload: string) =>
    ["bolt12_refund_decode", nodeId, payload] as const,
  rgbLnInvoiceDecode: (nodeId: string, payload: string) =>
    ["rgb_ln_invoice_decode", nodeId, payload] as const,
  rgbOnchainInvoiceDecode: (nodeId: string, payload: string) =>
    ["rgb_onchain_invoice_decode", nodeId, payload] as const,
  rgbInvoiceEstimateCarrier: (nodeId: string) =>
    ["rgb_invoice_estimate_carrier", nodeId] as const,
} as const;

export type QueryKey = ReturnType<
  (typeof queryKeys)[keyof typeof queryKeys]
>;
