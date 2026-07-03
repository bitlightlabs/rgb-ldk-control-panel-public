import {
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import {
  nodeChannelClose,
  nodeChannelForceClose,
  nodeChannelOpen,
  nodeMainPeers,
  nodeMainPeersConnect,
  nodeRgbContracts,
  nodeRgbSync,
} from "@/lib/commands";
import type {
  CloseChannelRequest,
  OkResponse,
  OpenChannelRequest,
  OpenChannelResponse,
} from "@/lib/sdk/types";
import { queryKeys } from "@/app/queries/queryKeys";

/** Open a BTC-only or RGB channel. Invalidates channels + peers of source. */
export function useChannelOpenMutation(
  options?: Omit<
    UseMutationOptions<
      OpenChannelResponse,
      Error,
      { nodeId: string; request: OpenChannelRequest }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request }) => nodeChannelOpen(nodeId, request),
    onSuccess: (...args) => {
      const { nodeId } = args[1];
      queryClient.invalidateQueries({ queryKey: queryKeys.nodeChannels(nodeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.nodePeers(nodeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.nodeBalances(nodeId) });
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/**
 * Full open-channel orchestration: optionally sync + verify the target has
 * the RGB asset, optionally connect the peer first, then open the channel.
 * This mirrors the legacy OpenChannelDialog multi-step flow.
 */
export function useOpenChannelMutation(
  options?: Omit<
    UseMutationOptions<
      OpenChannelResponse,
      Error,
      {
        sourceNodeId: string;
        request: OpenChannelRequest;
        rgbEnabled: boolean;
        targetContextId?: string | null;
        rgbAssetContractId?: string;
        connectFirst: boolean;
        persistPeer: boolean;
        address: string;
      }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: async (vars) => {
      const {
        sourceNodeId,
        request,
        rgbEnabled,
        targetContextId,
        rgbAssetContractId,
        connectFirst,
        persistPeer,
        address,
      } = vars;

      if (rgbEnabled && targetContextId) {
        await nodeRgbSync(targetContextId);
        const targetContracts = await nodeRgbContracts(targetContextId);
        const targetHasAsset = (targetContracts.contracts ?? []).some(
          (c) => c.contract_id === rgbAssetContractId?.trim(),
        );
        if (!targetHasAsset) {
          throw new Error(
            "Target node is missing this RGB asset. Import/sync the contract on the target node first.",
          );
        }
      }

      if (connectFirst) {
        const peerId = request.node_id.trim();
        const peers = await nodeMainPeers(sourceNodeId);
        const alreadyConnected = peers.some(
          (p) => p.node_id === peerId && p.is_connected,
        );
        if (!alreadyConnected) {
          await nodeMainPeersConnect(sourceNodeId, {
            node_id: peerId,
            address: address.trim(),
            persist: persistPeer,
          });
        }
      }

      return nodeChannelOpen(sourceNodeId, request);
    },
    onSuccess: (...args) => {
      const { sourceNodeId } = args[1];
      queryClient.invalidateQueries({
        queryKey: queryKeys.nodeChannels(sourceNodeId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.nodePeers(sourceNodeId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.nodeBalances(sourceNodeId),
      });
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/**
 * Close (or force-close) a channel. `force` selects the variant. Invalidates
 * channels, balances, and the events tail.
 */
export function useChannelCloseMutation(
  options?: Omit<
    UseMutationOptions<
      OkResponse,
      Error,
      { nodeId: string; request: CloseChannelRequest; force: boolean }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request, force }) =>
      force
        ? nodeChannelForceClose(nodeId, request)
        : nodeChannelClose(nodeId, request),
    onSuccess: (...args) => {
      const { nodeId } = args[1];
      queryClient.invalidateQueries({ queryKey: queryKeys.nodeChannels(nodeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.nodeBalances(nodeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.eventsListAll(nodeId) });
      onSuccess?.(...args);
    },
    ...rest,
  });
}
