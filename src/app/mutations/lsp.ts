import { nodeBuyBtcChannel, nodeBuyRGBChannel, nodeLspDelete, nodeLspOptionsUpdate, nodeLsps2Invoice, nodeLsps2OptionsUpdate, nodeLsps2Quote, nodeLsps2RgbInvoice, nodeLsps2RgbQuote, nodeUpdateCurrentLsp, nodeUpdateCurrentLspPricing } from "@/lib/commands";
import { Lsps2InvoiceRequest, Lsps2InvoiceResponse, Lsps2OptionsDto, Lsps2OptionsResponse, Lsps2QuoteRequest, Lsps2QuoteResponse, Lsps2RgbInvoiceRequest, Lsps2RgbInvoiceResponse, Lsps2RgbQuoteRequest, Lsps2RgbQuoteResponse } from "@/lib/sdk/generated-types";
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

export function useLspDeleteMutation(
  options?: Omit<
    UseMutationOptions<
      any,
      Error,
      {nodeId: string, lspPubkey: String}
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, lspPubkey }) =>
      nodeLspDelete(nodeId, lspPubkey),
    ...options,
  });
}


// LSPS@ ======
export function useNodeLsps2QuoteMutation(
  options?: Omit<
    UseMutationOptions<
      Lsps2QuoteResponse,
      Error,
      {nodeId: string, request: Lsps2QuoteRequest}
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeLsps2Quote(nodeId, request),
    ...options,
  });
}

export function useNodeLsps2InvoiceMutation(
  options?: Omit<
    UseMutationOptions<
      Lsps2InvoiceResponse,
      Error,
      {nodeId: string, request: Lsps2InvoiceRequest}
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeLsps2Invoice(nodeId, request),
    ...options,
  });
}

export function useNodeLsps2RgbQuoteMutation(
  options?: Omit<
    UseMutationOptions<
      Lsps2RgbQuoteResponse,
      Error,
      {nodeId: string, request: Lsps2RgbQuoteRequest}
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeLsps2RgbQuote(nodeId, request),
    ...options,
  });
}

export function useNodeLsps2RgbInvoiceMutation(
  options?: Omit<
    UseMutationOptions<
      Lsps2RgbInvoiceResponse,
      Error,
      {nodeId: string, request: Lsps2RgbInvoiceRequest}
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeLsps2RgbInvoice(nodeId, request),
    ...options,
  });
}

export function useNodeLsps2OptionsUpdateMutation(
  options?: Omit<
    UseMutationOptions<
      Lsps2OptionsResponse,
      Error,
      {nodeId: string, request: Lsps2OptionsDto}
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeLsps2OptionsUpdate(nodeId, request),
    ...options,
  });
}