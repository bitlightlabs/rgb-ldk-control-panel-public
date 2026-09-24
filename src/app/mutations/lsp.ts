import { nodeBuyBtcChannel, nodeBuyRGBChannel, nodeLspOptionsUpdate, nodeUpdateCurrentLsp, nodeUpdateCurrentLspPricing } from "@/lib/commands";
import type { LspConnectionInfo, LspOptions } from "@/lib/sdk/types";
import { useMutation, UseMutationOptions } from "@tanstack/react-query";

export function useUpdateCurrentLspPricingMutation(
  options?: Omit<
    UseMutationOptions<
      any,
      Error,
      any
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeUpdateCurrentLspPricing(nodeId, request),
    ...options,
  });
}

export function useUpdateLspMutation(
  options?: Omit<
    UseMutationOptions<
      any,
      Error,
      {nodeId: string, request: LspConnectionInfo}
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeUpdateCurrentLsp(nodeId, request),
    ...options,
  });
}

export function useBuyBtcChannelMutation(
  options?: Omit<
    UseMutationOptions<
      any,
      Error,
      {nodeId: string, request: any}
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeBuyBtcChannel(nodeId, request),
    ...options,
  });
}

export function useBuyRgbChannelMutation(
  options?: Omit<
    UseMutationOptions<
      any,
      Error,
      {nodeId: string, request: any}
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeBuyRGBChannel(nodeId, request),
    ...options,
  });
}

export function useLspOptionsUpdateMutation(
  options?: Omit<
    UseMutationOptions<
      any,
      Error,
      {nodeId: string, request: LspOptions}
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeLspOptionsUpdate(nodeId, request),
    ...options,
  });
}
