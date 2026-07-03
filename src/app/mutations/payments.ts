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
  nodePaymentAbandon,
  nodePaymentWait,
} from "@/lib/commands";
import type {
  Bolt11ReceiveRequest,
  Bolt12OfferReceiveRequest,
  Bolt12OfferReceiveVarRequest,
  Bolt12OfferSendRequest,
  OkResponse,
  PaymentWaitRequest,
  PaymentWaitResponse,
} from "@/lib/sdk/types";
import { queryKeys } from "@/app/queries/queryKeys";

/** Wait for a payment to reach a terminal state. */
export function usePaymentWaitMutation(
  options?: Omit<
    UseMutationOptions<
      PaymentWaitResponse,
      Error,
      { nodeId: string; paymentId: string; request: PaymentWaitRequest }
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, paymentId, request }) =>
      nodePaymentWait(nodeId, paymentId, request),
    ...options,
  });
}

/** Abandon a payment; invalidates the payments list. */
export function usePaymentAbandonMutation(
  options?: Omit<
    UseMutationOptions<
      OkResponse,
      Error,
      { nodeId: string; paymentId: string }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, paymentId }) =>
      nodePaymentAbandon(nodeId, paymentId),
    onSuccess: (...args) => {
      const { nodeId } = args[1];
      queryClient.invalidateQueries({ queryKey: queryKeys.nodePayments(nodeId) });
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/**
 * Create a BOLT12 offer on the payee and immediately send to it from the
 * payer. Returns the offer + payment id from the create step.
 */
export function useCreateAndSendBolt12OfferMutation(
  options?: Omit<
    UseMutationOptions<
      { offer: string; payment_id: string | null },
      Error,
      {
        payeeNodeId: string;
        payerNodeId: string;
        receive:
          | { kind: "fixed"; request: Bolt12OfferReceiveRequest }
          | { kind: "var"; request: Bolt12OfferReceiveVarRequest };
        send: Bolt12OfferSendRequest;
      }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: async ({ payeeNodeId, payerNodeId, receive, send }) => {
      const resp =
        receive.kind === "fixed"
          ? await nodeBolt12OfferReceive(payeeNodeId, receive.request)
          : await nodeBolt12OfferReceiveVar(payeeNodeId, receive.request);
      await nodeBolt12OfferSend(payerNodeId, { ...send, offer: resp.offer });
      // payment_id is present at runtime but not on the SDK type.
      return {
        offer: resp.offer,
        payment_id: (resp as { payment_id?: string | null }).payment_id ?? null,
      };
    },
    onSuccess: (...args) => {
      const { payeeNodeId, payerNodeId } = args[1];
      queryClient.invalidateQueries({ queryKey: queryKeys.nodePayments(payerNodeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.nodePayments(payeeNodeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.nodeBalances(payerNodeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.nodeBalances(payeeNodeId) });
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/**
 * Bolt11 transfer: create an invoice on the payee, then pay it from the
 * payer. Used by the TransferDialog.
 */
export function useBolt11TransferMutation(
  options?: Omit<
    UseMutationOptions<
      { invoice: string; payment_id: string | null },
      Error,
      {
        payeeNodeId: string;
        payerNodeId: string;
        request: Bolt11ReceiveRequest;
      }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: async ({ payeeNodeId, payerNodeId, request }) => {
      const resp = await nodeBolt11Receive(payeeNodeId, request);
      await nodeBolt11Send(payerNodeId, { invoice: resp.invoice });
      return {
        invoice: resp.invoice,
        // payment_id is present at runtime but not on the SDK type.
        payment_id: (resp as { payment_id?: string | null }).payment_id ?? null,
      };
    },
    onSuccess: (...args) => {
      const { payeeNodeId, payerNodeId } = args[1];
      queryClient.invalidateQueries({ queryKey: queryKeys.nodePayments(payerNodeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.nodePayments(payeeNodeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.nodeBalances(payerNodeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.nodeBalances(payeeNodeId) });
      onSuccess?.(...args);
    },
    ...rest,
  });
}
