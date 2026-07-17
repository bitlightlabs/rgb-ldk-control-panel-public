import { nodeSwapInfo, nodeSwapList } from "@/lib/commands";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { mergeNodeOptions } from "./internal";
import { SwapInfo } from "@/lib/sdk/types";

type NodeOptions<T> = Omit<UseQueryOptions<T>, "queryKey" | "queryFn"> & {
  enabled?: boolean;
};

export function useNodeSwapListQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<SwapInfo[]>,
) {
  return useQuery({
    queryKey: queryKeys.nodeSwapList(nodeId ?? ""),
    queryFn: () => nodeSwapList(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeSwapInfoQuery(
  nodeId: string | null | undefined,
  paymentHash: string,
  options?: NodeOptions<SwapInfo>,
) {
  return useQuery({
    queryKey: queryKeys.nodeSwapInfo(nodeId!, paymentHash),
    queryFn: () => nodeSwapInfo(nodeId!, paymentHash),
    ...mergeNodeOptions(nodeId, options),
  });
}
