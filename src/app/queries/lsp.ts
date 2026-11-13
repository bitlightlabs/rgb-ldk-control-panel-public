import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { nodeBuyChannelDetail, nodeCurrentLspOrders, nodeCurrentLspOrdersDetail, nodeCurrentLspPricing, nodeCurrentLsps, nodeLspOptions, nodeLsps2Options, nodeQueryLspQuote } from "@/lib/commands";
import { mergeNodeOptions } from "./internal";
import type { LspConnectionInfo, LspOptions, LspOrderItem, LspOrdersResponse, LspPricing, LspQuoteInfoResponse } from "@/lib/sdk/types";
import { Lsps2OptionsResponse } from "@/lib/sdk/generated-types";

type NodeOptions<T> = Omit<UseQueryOptions<T>, "queryKey" | "queryFn"> & {
  enabled?: boolean;
};

export function useNodeCurrentLspPricing(
  nodeId: string | null | undefined,
  options?: NodeOptions<LspPricing>,
) {
  return useQuery({
    queryKey: queryKeys.nodeCurrentLspPricing(nodeId!),
    queryFn: () => nodeCurrentLspPricing(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeLspQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<{lsps: LspConnectionInfo[]}>,
) {
  return useQuery({
    queryKey: queryKeys.nodeLspQuery(nodeId!),
    queryFn: () => nodeCurrentLsps(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeLspQuote(
  nodeId: string | null | undefined,
  pubkey: string,
  options?: NodeOptions<LspQuoteInfoResponse>,
) {
  return useQuery({
    queryKey: queryKeys.nodeQueryLspQuote(nodeId!, pubkey),
    queryFn: () => nodeQueryLspQuote(nodeId!, pubkey),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeCurrentLspOrdersQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<{orders: LspOrderItem[]}>,
) {
  return useQuery({
    queryKey: queryKeys.nodeCurrentLspOrders(nodeId!),
    queryFn: () => nodeCurrentLspOrders(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

// User side function
export function useBuyChannelDetailQuery(
  nodeId: string | null | undefined,
  orderId: string,
  options?: NodeOptions<LspOrdersResponse>,
) {
  return useQuery({
    queryKey: queryKeys.nodeBuyChannelDetail(nodeId!, orderId),
    queryFn: () => nodeBuyChannelDetail(nodeId!, orderId),
    ...mergeNodeOptions(nodeId, options),
  });
}

// LSP side function
export function useCurrentLspOrdersDetailQuery(
  nodeId: string | null | undefined,
  orderId: string,
  options?: NodeOptions<any>,
) {
  return useQuery({
    queryKey: queryKeys.nodeCurrentLspOrdersDetail(nodeId!, orderId),
    queryFn: () => nodeCurrentLspOrdersDetail(nodeId!, orderId),
    ...mergeNodeOptions(nodeId, options),
  });
}

// LSP side function
export function useLspOptionsQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<LspOptions>,
) {
  return useQuery({
    queryKey: queryKeys.nodeLspOptions(nodeId!),
    queryFn: () => nodeLspOptions(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeLsps2OptionsQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<Lsps2OptionsResponse>,
) {
  return useQuery({
    queryKey: queryKeys.nodeLsps2Options(nodeId!),
    queryFn: () => nodeLsps2Options(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}