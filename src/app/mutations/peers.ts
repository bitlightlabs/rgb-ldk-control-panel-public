import {
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { nodeMainPeersConnect, nodeMainPeersDisconnect } from "@/lib/commands";
import type { OkResponse, PeerConnectRequest, PeerDisconnectRequest } from "@/lib/sdk/types";
import { queryKeys } from "@/app/queries/queryKeys";

/** Connect to a peer; invalidates the peer list on success. */
export function usePeerConnectMutation(
  options?: Omit<
    UseMutationOptions<
      OkResponse,
      Error,
      { nodeId: string; request: PeerConnectRequest }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeMainPeersConnect(nodeId, request),
    onSuccess: (...args) => {
      const { nodeId } = args[1];
      queryClient.invalidateQueries({ queryKey: queryKeys.nodePeers(nodeId) });
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/** Disconnect from a peer; invalidates the peer list on success. */
export function usePeerDisconnectMutation(
  options?: Omit<
    UseMutationOptions<
      OkResponse,
      Error,
      { nodeId: string; request: PeerDisconnectRequest }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeMainPeersDisconnect(nodeId, request),
    onSuccess: (...args) => {
      const { nodeId } = args[1];
      queryClient.invalidateQueries({ queryKey: queryKeys.nodePeers(nodeId) });
      onSuccess?.(...args);
    },
    ...rest,
  });
}
