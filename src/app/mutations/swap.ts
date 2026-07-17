import {
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/app/queries/queryKeys";
import { nodeSwapAccept, nodeSwapExecute, nodeSwapOffers } from "@/lib/commands";
import { OkResponse, SwapInfo } from "@/lib/sdk";


export function useSwapOffersMutation(
  options?: Omit<
    UseMutationOptions<
      {
        swap_string: string
        payment_hash: string
        info: any
      },
      Error,
      { nodeId: string; request: any }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeSwapOffers(nodeId, request),
    onSuccess: (...args) => {
      const { nodeId } = args[1];
      queryClient.invalidateQueries({ queryKey: queryKeys.nodeSwapOffers(nodeId) });
      onSuccess?.(...args);
    },
    ...rest,
  });
}

export function useNodeSwapAcceptMutation(
  nodeId: string | null | undefined,
  swapString: string,
  options?: Omit<
    UseMutationOptions<SwapInfo, Error, { nodeId: string; swapString: string }>,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, swapString }) =>
      nodeSwapAccept(nodeId!, swapString),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nodeSwapAccept(nodeId ?? "", swapString) });
      onSuccess?.(...args);
    },
    ...rest,
  });
}

export function useNodeSwapExecuteMutation(
  options?: Omit<
    UseMutationOptions<OkResponse, Error, { nodeId: string; request: any }>,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeSwapExecute(nodeId!, request),
    onSuccess: (...args) => {
      const { nodeId } = args[1];
      queryClient.invalidateQueries({ queryKey: queryKeys.nodeSwapExecute(nodeId) });
      onSuccess?.(...args);
    },
    ...rest,
  });
}
