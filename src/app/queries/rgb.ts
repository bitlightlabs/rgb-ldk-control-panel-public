import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  nodeMainHttp,
  nodeRgbContractBalance,
  nodeRgbContracts,
  nodeRgbIssuers,
  nodeRgbOnchainPayments,
  nodeRgbSync,
  nodeRgbLnInvoiceDecode,
  nodeRgbUtxos,
  nodeRgbLnInvoiceEstimateCarrier,
} from "@/lib/commands";
import type { NodeHttpProxyResponse } from "@/lib/domain";
import type {
  RgbContractBalanceResponse,
  RgbContractsResponse,
  RgbIssuersResponse,
  RgbOnchainPaymentsResponse,
} from "@/lib/sdk/types";
import type { RgbUtxoDto } from "@/lib/sdk/generated-types";
import { queryKeys } from "./queryKeys";
import { mergeNodeOptions } from "./internal";

type NodeOptions<T> = Omit<UseQueryOptions<T>, "queryKey" | "queryFn"> & {
  enabled?: boolean;
};

const decodeQueryDefaults = {
  gcTime: 0,
  staleTime: 0,
} as const;

/** nodeRgbLnInvoiceDecode returns a plain-string shape (see commands.ts). */
type RgbLnInvoiceDecodeResult = Awaited<
  ReturnType<typeof nodeRgbLnInvoiceDecode>
>;

/** nodeRgbContracts — pure read. */
export function useNodeRgbContractsQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<RgbContractsResponse>,
) {
  return useQuery({
    queryKey: queryKeys.rgbContracts(nodeId ?? ""),
    queryFn: () => nodeRgbContracts(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeRgbContractBalanceQuery(
  nodeId: string | null | undefined,
  contractId: string | null | undefined,
  options?: NodeOptions<RgbContractBalanceResponse>,
) {
  return useQuery({
    queryKey: queryKeys.rgbContractBalance(nodeId ?? "", contractId ?? ""),
    queryFn: () => nodeRgbContractBalance(nodeId!, contractId!),
    ...mergeNodeOptions(nodeId, options, !!contractId),
  });
}

/** Runs nodeRgbSync first, then returns nodeRgbContracts. */
export function useNodeRgbContractsSyncedQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<RgbContractsResponse>,
) {
  return useQuery({
    queryKey: queryKeys.rgbContractsSynced(nodeId ?? ""),
    queryFn: async () => {
      await nodeRgbSync(nodeId!);
      return nodeRgbContracts(nodeId!);
    },
    ...mergeNodeOptions(nodeId, options),
  });
}

/** nodeRgbIssuers. */
export function useNodeRgbIssuersQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<RgbIssuersResponse>,
) {
  return useQuery({
    queryKey: queryKeys.rgbIssuers(nodeId ?? ""),
    queryFn: () => nodeRgbIssuers(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

/** nodeRgbOnchainPayments. `scope` keeps multiple polling uses separate. */
export function useNodeRgbOnchainPaymentsQuery(
  nodeId: string | null | undefined,
  scope?: string,
  options?: NodeOptions<RgbOnchainPaymentsResponse>,
) {
  return useQuery({
    queryKey: queryKeys.rgbOnchainPayments(nodeId ?? "", scope),
    queryFn: () => nodeRgbOnchainPayments(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeRgbUtxosQuery(
  nodeId: string | null | undefined,
  refresh = true,
  options?: NodeOptions<{ utxos: RgbUtxoDto[] }>,
) {
  return useQuery({
    queryKey: queryKeys.rgbUtxos(nodeId ?? "", refresh),
    queryFn: () => nodeRgbUtxos(nodeId!, refresh),
    ...mergeNodeOptions(nodeId, options),
  });
}

/** Decode an RGB LN invoice via the typed command binding. */
export function useRgbLnInvoiceDecodeQuery(
  nodeId: string | null | undefined,
  payload: string,
  options?: NodeOptions<RgbLnInvoiceDecodeResult>,
) {
  return useQuery({
    queryKey: queryKeys.rgbLnInvoiceDecode(nodeId ?? "", payload),
    queryFn: () => nodeRgbLnInvoiceDecode(nodeId!, { invoice: payload }),
    ...decodeQueryDefaults,
    ...mergeNodeOptions(nodeId, options, !!payload && payload.trim() !== ""),
  });
}

/**
 * Decode an RGB onchain invoice. The backend exposes this through the main
 * HTTP proxy (POST /rgb/onchain/invoice/decode), so we reuse nodeMainHttp.
 */
export function useRgbOnchainInvoiceDecodeQuery(
  nodeId: string | null | undefined,
  payload: string,
  options?: NodeOptions<NodeHttpProxyResponse>,
) {
  return useQuery({
    queryKey: queryKeys.rgbOnchainInvoiceDecode(nodeId ?? "", payload),
    queryFn: () =>
      nodeMainHttp(nodeId!, {
        method: "POST",
        path: "/rgb/onchain/invoice/decode",
        headers: { "content-type": "application/json" },
        bodyText: JSON.stringify({ invoice: payload }),
      }),
    ...decodeQueryDefaults,
    ...mergeNodeOptions(nodeId, options, !!payload && payload.trim() !== ""),
  });
}

export function useRgbInvoiceEstimateCarrierQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<{
    minimum_viable_carrier_amount_msat: string
    receive_available: boolean
  }>,
) {
  return useQuery({
    queryKey: queryKeys.rgbInvoiceEstimateCarrier(nodeId ?? ""),
    queryFn: () =>
      nodeRgbLnInvoiceEstimateCarrier(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}
