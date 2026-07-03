import {
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import {
  nodeRgbUtxosFund,
  nodeRgbUtxoSweep,
  nodeRgbUtxoTopUp,
  nodeWalletL1Utxos,
} from "@/lib/commands";
import type {
  RgbUtxosFundRequest,
  RgbUtxosFundResponse,
  RgbUtxosSweepRequest,
  RgbUtxosSweepResponse,
  RgbUtxosTopUpRequest,
  RgbUtxosTopUpResponse,
  WalletUtxosResponse,
} from "@/lib/sdk/generated-types";
import { queryKeys } from "@/app/queries/queryKeys";

function invalidateUtxoState(
  queryClient: ReturnType<typeof useQueryClient>,
  nodeId: string,
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.nodeBalances(nodeId) });
  queryClient.invalidateQueries({ queryKey: ["rgb_utxos", nodeId] });
}

/** Sweep RGB UTXOs. The caller handles post-success side effects. */
export function useRgbUtxoSweepMutation(
  options?: Omit<
    UseMutationOptions<
      RgbUtxosSweepResponse,
      Error,
      { nodeId: string; request: RgbUtxosSweepRequest }
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, request }) => nodeRgbUtxoSweep(nodeId, request),
    ...options,
  });
}

/** Fetch spendable L1 UTXOs for a one-shot funding flow. */
export function useNodeWalletL1UtxosMutation(
  options?: Omit<UseMutationOptions<WalletUtxosResponse, Error, string>, "mutationFn">,
) {
  return useMutation({
    mutationFn: (nodeId: string) => nodeWalletL1Utxos(nodeId),
    ...options,
  });
}

/** Create RGB carrier UTXOs; invalidates wallet balance and RGB UTXO list. */
export function useRgbUtxosFundMutation(
  options?: Omit<
    UseMutationOptions<
      RgbUtxosFundResponse,
      Error,
      { nodeId: string; request: RgbUtxosFundRequest }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request }) => nodeRgbUtxosFund(nodeId, request),
    onSuccess: (...args) => {
      const { nodeId } = args[1];
      invalidateUtxoState(queryClient, nodeId);
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/** Top up an RGB carrier UTXO; invalidates wallet balance and RGB UTXO list. */
export function useRgbUtxoTopUpMutation(
  options?: Omit<
    UseMutationOptions<
      RgbUtxosTopUpResponse,
      Error,
      { nodeId: string; request: RgbUtxosTopUpRequest }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request }) => nodeRgbUtxoTopUp(nodeId, request),
    onSuccess: (...args) => {
      const { nodeId } = args[1];
      invalidateUtxoState(queryClient, nodeId);
      onSuccess?.(...args);
    },
    ...rest,
  });
}
