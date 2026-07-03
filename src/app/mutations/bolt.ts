import {
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import {
  nodeBolt11Receive,
  nodeBolt11Send,
  nodeBolt12OfferReceive,
  nodeBolt12OfferReceiveVar,
  nodeBolt12OfferSend,
  nodeBolt12RefundInitiate,
  nodeBolt12RefundRequestPayment,
} from "@/lib/commands";
import type {
  Bolt11ReceiveRequest,
  Bolt11ReceiveResponse,
  Bolt11SendRequest,
  Bolt12OfferReceiveRequest,
  Bolt12OfferReceiveVarRequest,
  Bolt12OfferResponse,
  Bolt12OfferSendRequest,
  Bolt12RefundInitiateRequest,
  Bolt12RefundInitiateResponse,
  Bolt12RefundRequestPaymentRequest,
  Bolt12RefundRequestPaymentResponse,
  SendResponse,
} from "@/lib/sdk/types";
import { queryKeys } from "@/app/queries/queryKeys";

function invalidatePayments(nodeId: string) {
  // bolt operations eventually surface in the payments list
  return { queryKey: queryKeys.nodePayments(nodeId) };
}

/** Create a BOLT11 invoice (receive). */
export function useBolt11ReceiveMutation(
  options?: Omit<
    UseMutationOptions<
      Bolt11ReceiveResponse,
      Error,
      { nodeId: string; request: Bolt11ReceiveRequest }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request }) => nodeBolt11Receive(nodeId, request),
    onSuccess: (...args) => {
      queryClient.invalidateQueries(invalidatePayments(args[1].nodeId));
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/** Pay a BOLT11 invoice. */
export function useBolt11SendMutation(
  options?: Omit<
    UseMutationOptions<
      SendResponse,
      Error,
      { nodeId: string; request: Bolt11SendRequest }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request }) => nodeBolt11Send(nodeId, request),
    onSuccess: (...args) => {
      queryClient.invalidateQueries(invalidatePayments(args[1].nodeId));
      queryClient.invalidateQueries({
        queryKey: queryKeys.nodeBalances(args[1].nodeId),
      });
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/** Receive a fixed-amount BOLT12 offer. */
export function useBolt12OfferReceiveMutation(
  options?: Omit<
    UseMutationOptions<
      Bolt12OfferResponse,
      Error,
      { nodeId: string; request: Bolt12OfferReceiveRequest }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeBolt12OfferReceive(nodeId, request),
    onSuccess: (...args) => {
      queryClient.invalidateQueries(invalidatePayments(args[1].nodeId));
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/** Receive a variable-amount BOLT12 offer. */
export function useBolt12OfferReceiveVarMutation(
  options?: Omit<
    UseMutationOptions<
      Bolt12OfferResponse,
      Error,
      { nodeId: string; request: Bolt12OfferReceiveVarRequest }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeBolt12OfferReceiveVar(nodeId, request),
    onSuccess: (...args) => {
      queryClient.invalidateQueries(invalidatePayments(args[1].nodeId));
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/** Send to a BOLT12 offer. */
export function useBolt12OfferSendMutation(
  options?: Omit<
    UseMutationOptions<
      SendResponse,
      Error,
      { nodeId: string; request: Bolt12OfferSendRequest }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request }) => nodeBolt12OfferSend(nodeId, request),
    onSuccess: (...args) => {
      queryClient.invalidateQueries(invalidatePayments(args[1].nodeId));
      queryClient.invalidateQueries({
        queryKey: queryKeys.nodeBalances(args[1].nodeId),
      });
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/** Initiate a BOLT12 refund (payer side). */
export function useBolt12RefundInitiateMutation(
  options?: Omit<
    UseMutationOptions<
      Bolt12RefundInitiateResponse,
      Error,
      { nodeId: string; request: Bolt12RefundInitiateRequest }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeBolt12RefundInitiate(nodeId, request),
    onSuccess: (...args) => {
      queryClient.invalidateQueries(invalidatePayments(args[1].nodeId));
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/** Request a payment against a BOLT12 refund (payee side). */
export function useBolt12RefundRequestPaymentMutation(
  options?: Omit<
    UseMutationOptions<
      Bolt12RefundRequestPaymentResponse,
      Error,
      { nodeId: string; request: Bolt12RefundRequestPaymentRequest }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeBolt12RefundRequestPayment(nodeId, request),
    onSuccess: (...args) => {
      queryClient.invalidateQueries(invalidatePayments(args[1].nodeId));
      onSuccess?.(...args);
    },
    ...rest,
  });
}
