import { nodeSwapInfo, nodeSwapList } from "@/lib/commands";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { mergeNodeOptions } from "./internal";
import { SwapInfoDto } from "@/lib/sdk/generated-types";

type NodeOptions<T> = Omit<UseQueryOptions<T>, "queryKey" | "queryFn"> & {
  enabled?: boolean;
};

export function useNodeSwapListQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<SwapInfoDto[]>,
) {
  return useQuery({
    queryKey: queryKeys.nodeSwapList(nodeId ?? ""),
    queryFn: () => nodeSwapList(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeSwapInfoQuery(
  nodeId: string | null | undefined,
  executionId: string,
  options?: NodeOptions<SwapInfoDto>,
) {
  return useQuery({
    queryKey: queryKeys.nodeSwapInfo(nodeId!, executionId),
    queryFn: () => nodeSwapInfo(nodeId!, executionId),
    ...mergeNodeOptions(nodeId, options),
  });
}
