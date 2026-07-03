import {
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import {
  nodeRgbNewAddress,
  nodeRgbSync,
  nodeWalletNewAddress,
  nodeWalletSync,
} from "@/lib/commands";
import type { WalletNewAddressResponse } from "@/lib/domain";
import type { OkResponse } from "@/lib/sdk/types";
import { queryKeys } from "@/app/queries/queryKeys";

/**
 * Wallet sync that also resyncs RGB state. Mirrors what the dashboard's sync
 * button does (nodeWalletSync + nodeRgbSync), then invalidates balances and
 * RGB contracts so the UI refreshes.
 */
export function useWalletSyncMutation(
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: async (nodeId: string) => {
      await nodeWalletSync(nodeId);
      await nodeRgbSync(nodeId);
    },
    onSuccess: (...args) => {
      const nodeId = args[1];
      queryClient.invalidateQueries({ queryKey: queryKeys.nodeBalances(nodeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.rgbContracts(nodeId) });
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/** Generate a new on-chain wallet address; invalidates balances. */
export function useNodeWalletNewAddressMutation(
  options?: Omit<
    UseMutationOptions<WalletNewAddressResponse, Error, string>,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: (nodeId: string) => nodeWalletNewAddress(nodeId),
    onSuccess: (...args) => {
      const nodeId = args[1];
      queryClient.invalidateQueries({ queryKey: queryKeys.nodeBalances(nodeId) });
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/** Generate a new RGB wallet address. */
export function useNodeRgbNewAddressMutation(
  options?: Omit<
    UseMutationOptions<WalletNewAddressResponse, Error, string>,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: (nodeId: string) => nodeRgbNewAddress(nodeId),
    ...options,
  });
}

/** nodeWalletSync only (no RGB). Kept for parity with the legacy page. */
export function useNodeWalletSyncMutation(
  options?: Omit<UseMutationOptions<OkResponse, Error, string>, "mutationFn">,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: (nodeId: string) => nodeWalletSync(nodeId),
    onSuccess: (...args) => {
      const nodeId = args[1];
      queryClient.invalidateQueries({ queryKey: queryKeys.nodeBalances(nodeId) });
      onSuccess?.(...args);
    },
    ...rest,
  });
}
