import {
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import {
  nodeBolt11Receive,
  nodeBolt11Send,
  nodeBolt12OfferReceiveVar,
  nodeBolt12OfferSend,
  nodeRgbLnInvoiceCreate,
  nodeRgbLnPay,
  nodeRgbOnchainInvoiceCreate,
  nodeRgbOnchainSend,
  nodeWalletNewAddress,
} from "@/lib/commands";
import type { WalletNewAddressResponse } from "@/lib/domain";
import type {
  Bolt11ReceiveRequest,
  Bolt12OfferReceiveVarRequest,
  Bolt12OfferSendRequest,
  RgbLnInvoiceCreateRequest,
  RgbLnPayRequest,
  RgbOnchainInvoiceCreateRequest,
  RgbOnchainInvoiceResponse,
  RgbOnchainSendResponse,
  RgbLnInvoiceResponse,
  Bolt11ReceiveResponse,
  Bolt12OfferResponse,
  SendResponse,
} from "@/lib/sdk/types";
import { queryKeys } from "@/app/queries/queryKeys";

/** What kind of payload the user pasted into the Send flow. */
export type SendPayloadKind =
  | "onchain_asset"
  | "rgb_invoice"
  | "invoice"
  | "offer";

export type SendPaymentInput = {
  nodeId: string;
  kind: SendPayloadKind;
  payload: string;
  amountMsat?: string;
  feeRateSatsPerVb?: number;
};

export type SendPaymentResult =
  | { kind: "onchain_asset"; result: RgbOnchainSendResponse }
  | { kind: "rgb_invoice"; result: SendResponse }
  | { kind: "invoice"; result: SendResponse }
  | { kind: "offer"; result: SendResponse };

/**
 * Unified send dispatcher for the flows Send page. Branches on the detected
 * payload kind and delegates to the right backend command. Invalidates
 * payments + balances on success.
 */
export function useSendPaymentMutation(
  options?: Omit<
    UseMutationOptions<SendPaymentResult, Error, SendPaymentInput>,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: async ({ nodeId, kind, payload, amountMsat, feeRateSatsPerVb }) => {
      switch (kind) {
        case "onchain_asset": {
          const result = await nodeRgbOnchainSend(nodeId, {
            invoice: payload,
            fee_rate_sats_per_vb: feeRateSatsPerVb ?? 1,
          });
          return { kind, result } as SendPaymentResult;
        }
        case "rgb_invoice": {
          const req: RgbLnPayRequest = { invoice: payload };
          const result = await nodeRgbLnPay(nodeId, req);
          return { kind, result } as SendPaymentResult;
        }
        case "invoice": {
          const result = await nodeBolt11Send(nodeId, { invoice: payload });
          return { kind, result } as SendPaymentResult;
        }
        case "offer": {
          const req: Bolt12OfferSendRequest = {
            offer: payload,
            amount_msat: amountMsat ?? "0",
            quantity: null,
            payer_note: null,
          };
          const result = await nodeBolt12OfferSend(nodeId, req);
          return { kind, result } as SendPaymentResult;
        }
      }
    },
    onSuccess: (...args) => {
      const { nodeId } = args[1];
      queryClient.invalidateQueries({ queryKey: queryKeys.nodePayments(nodeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.nodeBalances(nodeId) });
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/** What the user wants to receive in the flows Receive page. */
export type ReceiveMode =
  | "rgb_onchain_invoice"
  | "btc_onchain_address"
  | "rgb_invoice"
  | "invoice"
  | "offer";

export type CreateReceiveInput = {
  nodeId: string;
  mode: ReceiveMode;
  // rgb onchain invoice
  rgbOnchainRequest?: RgbOnchainInvoiceCreateRequest;
  // rgb ln invoice
  rgbLnRequest?: RgbLnInvoiceCreateRequest;
  // bolt11 invoice
  bolt11Request?: Bolt11ReceiveRequest;
  // bolt12 offer (variable)
  bolt12Request?: Bolt12OfferReceiveVarRequest;
};

export type CreateReceiveResult =
  | { mode: "rgb_onchain_invoice"; result: RgbOnchainInvoiceResponse }
  | { mode: "btc_onchain_address"; result: WalletNewAddressResponse }
  | { mode: "rgb_invoice"; result: RgbLnInvoiceResponse }
  | { mode: "invoice"; result: Bolt11ReceiveResponse }
  | { mode: "offer"; result: Bolt12OfferResponse };

/**
 * Unified receive dispatcher for the flows Receive page. Branches on the
 * selected mode and delegates to the right backend command.
 */
export function useCreateReceiveMutation(
  options?: Omit<
    UseMutationOptions<CreateReceiveResult, Error, CreateReceiveInput>,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: async ({ nodeId, mode, rgbOnchainRequest, rgbLnRequest, bolt11Request, bolt12Request }) => {
      switch (mode) {
        case "rgb_onchain_invoice": {
          const result = await nodeRgbOnchainInvoiceCreate(nodeId, rgbOnchainRequest!);
          return { mode, result } as CreateReceiveResult;
        }
        case "btc_onchain_address": {
          const result = await nodeWalletNewAddress(nodeId);
          return { mode, result } as CreateReceiveResult;
        }
        case "rgb_invoice": {
          const result = await nodeRgbLnInvoiceCreate(nodeId, rgbLnRequest!);
          return { mode, result } as CreateReceiveResult;
        }
        case "invoice": {
          const result = await nodeBolt11Receive(nodeId, bolt11Request!);
          return { mode, result } as CreateReceiveResult;
        }
        case "offer": {
          const result = await nodeBolt12OfferReceiveVar(nodeId, bolt12Request!);
          return { mode, result } as CreateReceiveResult;
        }
      }
    },
    ...options,
  });
}
