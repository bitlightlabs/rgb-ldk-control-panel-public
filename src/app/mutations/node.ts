import {
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { nodeLock, nodeUnlock } from "@/lib/commands";
import type { ControlStatusDto } from "@/lib/domain";
import { queryKeys } from "@/app/queries/queryKeys";

/**
 * Invalidate every cache that flips when a node's lock state changes:
 * status, healthz, readyz, control-status, node id, version, balances,
 * peers, listening addresses. Used by both lock and unlock.
 */
function invalidateNodeLockState(
  queryClient: ReturnType<typeof useQueryClient>,
  nodeId: string,
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.nodeStatus(nodeId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.nodeHealthz(nodeId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.nodeReadyz(nodeId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.nodeControlStatus(nodeId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.nodeId(nodeId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.nodeVersion(nodeId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.nodeBalances(nodeId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.nodePeers(nodeId) });
  queryClient.invalidateQueries({
    queryKey: queryKeys.nodeListeningAddresses(nodeId),
  });
}

type LockOptions = Omit<
  UseMutationOptions<ControlStatusDto, Error, string>,
  "mutationFn"
>;

/** Unlock a node, then refresh everything that depends on lock state. */
export function useNodeUnlockMutation(options?: LockOptions) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: (nodeId: string) => nodeUnlock(nodeId),
    onSuccess: (data, nodeId, onMutateCtx, context) => {
      invalidateNodeLockState(queryClient, nodeId);
      onSuccess?.(data, nodeId, onMutateCtx, context);
    },
    ...rest,
  });
}

/** Lock a node, then refresh everything that depends on lock state. */
export function useNodeLockMutation(options?: LockOptions) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: (nodeId: string) => nodeLock(nodeId),
    onSuccess: (data, nodeId, onMutateCtx, context) => {
      invalidateNodeLockState(queryClient, nodeId);
      onSuccess?.(data, nodeId, onMutateCtx, context);
    },
    ...rest,
  });
}
