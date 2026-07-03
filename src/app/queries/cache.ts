import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";

const NODE_QUERY_PREFIXES = [
  "node_status",
  "node_healthz",
  "node_readyz",
  "node_id",
  "node_version",
  "node_listening_addresses",
  "node_control_status",
  "node_balances",
  "node_wallet_address_current",
  "node_channels",
  "node_peers",
  "node_payments",
  "rgb_contracts",
  "rgb_contract_balance",
  "rgb_contracts_synced",
  "rgb_issuers",
  "rgb_onchain_payments",
  "rgb_utxos",
  "mnemonic",
  "events_list",
  "events_status",
  "bolt11_decode",
  "bolt12_offer_decode",
  "bolt12_refund_decode",
  "rgb_ln_invoice_decode",
  "rgb_onchain_invoice_decode",
] as const;

export function removeMnemonicCache(
  queryClient: QueryClient,
  nodeId: string | null | undefined,
) {
  if (!nodeId) return;
  queryClient.removeQueries({ queryKey: queryKeys.mnemonic(nodeId) });
}

export function removeNodeScopedCache(
  queryClient: QueryClient,
  nodeId: string | null | undefined,
) {
  if (!nodeId) return;

  for (const prefix of NODE_QUERY_PREFIXES) {
    queryClient.removeQueries({ queryKey: [prefix, nodeId] });
  }
}

export function clearSessionCache(
  queryClient: QueryClient,
  nodeId: string | null | undefined,
) {
  if (nodeId) {
    removeNodeScopedCache(queryClient, nodeId);
    return;
  }

  queryClient.removeQueries();
}
