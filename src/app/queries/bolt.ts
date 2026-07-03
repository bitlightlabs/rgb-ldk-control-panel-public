import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  nodeBolt11Decode,
  nodeBolt12OfferDecode,
  nodeBolt12RefundDecode,
} from "@/lib/commands";
import type {
  Bolt11DecodeResponse,
  Bolt12OfferDecodeResponse,
  Bolt12RefundDecodeResponse,
} from "@/lib/sdk/types";
import { queryKeys } from "./queryKeys";
import { mergeNodeOptions } from "./internal";

type NodeOptions<T> = Omit<UseQueryOptions<T>, "queryKey" | "queryFn"> & {
  enabled?: boolean;
};

const decodeQueryDefaults = {
  gcTime: 0,
  staleTime: 0,
} as const;

function hasPayload(payload: string): boolean {
  return !!payload && payload.trim() !== "";
}

export function useBolt11DecodeQuery(
  nodeId: string | null | undefined,
  payload: string,
  options?: NodeOptions<Bolt11DecodeResponse>,
) {
  return useQuery({
    queryKey: queryKeys.bolt11Decode(nodeId ?? "", payload),
    queryFn: () => nodeBolt11Decode(nodeId!, { invoice: payload }),
    ...decodeQueryDefaults,
    ...mergeNodeOptions(nodeId, options, hasPayload(payload)),
  });
}

export function useBolt12OfferDecodeQuery(
  nodeId: string | null | undefined,
  payload: string,
  options?: NodeOptions<Bolt12OfferDecodeResponse>,
) {
  return useQuery({
    queryKey: queryKeys.bolt12OfferDecode(nodeId ?? "", payload),
    queryFn: () => nodeBolt12OfferDecode(nodeId!, { offer: payload }),
    ...decodeQueryDefaults,
    ...mergeNodeOptions(nodeId, options, hasPayload(payload)),
  });
}

export function useBolt12RefundDecodeQuery(
  nodeId: string | null | undefined,
  payload: string,
  options?: NodeOptions<Bolt12RefundDecodeResponse>,
) {
  return useQuery({
    queryKey: queryKeys.bolt12RefundDecode(nodeId ?? "", payload),
    queryFn: () => nodeBolt12RefundDecode(nodeId!, { refund: payload }),
    ...decodeQueryDefaults,
    ...mergeNodeOptions(nodeId, options, hasPayload(payload)),
  });
}
