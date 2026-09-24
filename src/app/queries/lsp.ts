import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { nodeBuyChannelDetail, nodeCurrentLsp, nodeCurrentLspOrders, nodeCurrentLspOrdersDetail, nodeCurrentLspPricing, nodeLspOptions, nodeQueryLspQuote } from "@/lib/commands";
import { mergeNodeOptions } from "./internal";
import type { LspConnectionInfo, LspOptions, LspOrderItem, LspOrdersResponse, LspPricing, LspQuoteData } from "@/lib/sdk/types";

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
  options?: NodeOptions<LspConnectionInfo>,
) {
  return useQuery({
    queryKey: queryKeys.nodeLspQuery(nodeId!),
    queryFn: () => nodeCurrentLsp(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeLspQuote(
  nodeId: string | null | undefined,
  options?: NodeOptions<LspQuoteData>,
) {
  return useQuery({
    queryKey: queryKeys.nodeQueryLspQuote(nodeId!),
    queryFn: () => nodeQueryLspQuote(nodeId!),
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
