import {
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { contextsRemove } from "@/lib/commands";
import { queryKeys } from "@/app/queries/queryKeys";
import { removeNodeScopedCache } from "@/app/queries/cache";

/** Remove a node context; invalidates the contexts list on success. */
export function useContextsRemoveMutation(
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: (nodeId: string) => contextsRemove(nodeId),
    onSuccess: (data, nodeId, onMutateCtx, context) => {
      removeNodeScopedCache(queryClient, nodeId);
      queryClient.invalidateQueries({ queryKey: queryKeys.contexts() });
      onSuccess?.(data, nodeId, onMutateCtx, context);
    },
    ...rest,
  });
}
