import {
  useMutation,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { nodeSwapAccept, nodeSwapExecute, nodeSwapOffers } from "@/lib/commands";
import type { SwapCreateOfferRequest, SwapExecuteRequest, SwapExecuteResponse, SwapInfoDto, SwapOfferResponse } from "@/lib/sdk/generated-types";

export function useSwapOffersMutation(
  options?: Omit<
    UseMutationOptions<
      SwapOfferResponse,
      Error,
      { nodeId: string; request: SwapCreateOfferRequest }
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeSwapOffers(nodeId, request),
    ...options,
  });
}

export function useNodeSwapAcceptMutation(
  options?: Omit<
    UseMutationOptions<SwapInfoDto, Error, { nodeId: string; swapString: string }>,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, swapString }) =>
      nodeSwapAccept(nodeId!, swapString),
    ...options
  });
}

export function useNodeSwapExecuteMutation(
  options?: Omit<
    UseMutationOptions<SwapExecuteResponse, Error, { nodeId: string; request: SwapExecuteRequest }>,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeSwapExecute(nodeId!, request),
    ...options
  });
}
