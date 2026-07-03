import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  nodeControlStatus,
  nodeMainBalances,
  nodeMainChannels,
  nodeMainHealthz,
  nodeMainListeningAddresses,
  nodeMainNodeId,
  nodeMainPeers,
  nodeMainReadyz,
  nodeMainStatus,
  nodeMainVersion,
  nodeWalletAddressCurrent,
  nodePaymentsList,
} from "@/lib/commands";
import type {
  ControlStatusDto,
  VersionResponse,
  WalletNewAddressResponse,
} from "@/lib/domain";
import type {
  BalancesDto,
  ChannelDetailsExtendedDto,
  ListeningAddressesResponse,
  NodeIdResponse,
  OkResponse,
  PaymentDetailsDto,
  PeerDetailsDto,
  StatusDto,
} from "@/lib/sdk/types";
import { queryKeys } from "./queryKeys";
import { mergeNodeOptions } from "./internal";

type NodeOptions<T> = Omit<UseQueryOptions<T>, "queryKey" | "queryFn"> & {
  enabled?: boolean;
};

export function useNodeMainStatusQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<StatusDto>,
) {
  return useQuery({
    queryKey: queryKeys.nodeStatus(nodeId ?? ""),
    queryFn: () => nodeMainStatus(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeMainHealthzQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<OkResponse>,
) {
  return useQuery({
    queryKey: queryKeys.nodeHealthz(nodeId ?? ""),
    queryFn: () => nodeMainHealthz(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeMainReadyzQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<OkResponse>,
) {
  return useQuery({
    queryKey: queryKeys.nodeReadyz(nodeId ?? ""),
    queryFn: () => nodeMainReadyz(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeMainNodeIdQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<NodeIdResponse>,
) {
  return useQuery({
    queryKey: queryKeys.nodeId(nodeId ?? ""),
    queryFn: () => nodeMainNodeId(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeMainVersionQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<VersionResponse>,
) {
  return useQuery({
    queryKey: queryKeys.nodeVersion(nodeId ?? ""),
    queryFn: () => nodeMainVersion(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeMainListeningAddressesQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<ListeningAddressesResponse>,
) {
  return useQuery({
    queryKey: queryKeys.nodeListeningAddresses(nodeId ?? ""),
    queryFn: () => nodeMainListeningAddresses(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeControlStatusQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<ControlStatusDto>,
) {
  return useQuery({
    queryKey: queryKeys.nodeControlStatus(nodeId ?? ""),
    queryFn: () => nodeControlStatus(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeMainBalancesQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<BalancesDto>,
) {
  return useQuery({
    queryKey: queryKeys.nodeBalances(nodeId ?? ""),
    queryFn: () => nodeMainBalances(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeWalletAddressCurrentQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<WalletNewAddressResponse>,
) {
  return useQuery({
    queryKey: queryKeys.nodeWalletAddressCurrent(nodeId ?? ""),
    queryFn: () => nodeWalletAddressCurrent(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeMainChannelsQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<ChannelDetailsExtendedDto[]>,
) {
  return useQuery({
    queryKey: queryKeys.nodeChannels(nodeId ?? ""),
    queryFn: () => nodeMainChannels(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodeMainPeersQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<PeerDetailsDto[]>,
) {
  return useQuery({
    queryKey: queryKeys.nodePeers(nodeId ?? ""),
    queryFn: () => nodeMainPeers(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

export function useNodePaymentsListQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<PaymentDetailsDto[]>,
) {
  return useQuery({
    queryKey: queryKeys.nodePayments(nodeId ?? ""),
    queryFn: () => nodePaymentsList(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}
