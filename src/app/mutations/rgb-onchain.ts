import {
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import {
  downloadTransferConsignmentFromLink,
  downloadTransferConsignmentFromLinkWithoutVerify,
  nodeRgbOnchainInvoiceCreate,
  nodeRgbOnchainPayments,
  nodeRgbOnchainSend,
  nodeRgbOnchainTransferConsignmentAccept,
} from "@/lib/commands";
import type { RgbContractsExportBundle } from "@/lib/domain";
import type {
  RgbOnchainInvoiceCreateRequest,
  RgbOnchainInvoiceResponse,
  RgbOnchainPaymentsResponse,
  RgbOnchainSendResponse,
} from "@/lib/sdk/types";
import { queryKeys } from "@/app/queries/queryKeys";

function invalidateRgbOnchainState(
  queryClient: ReturnType<typeof useQueryClient>,
  nodeId: string,
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.rgbOnchainPaymentsAll(nodeId),
  });
  queryClient.invalidateQueries({ queryKey: queryKeys.rgbContracts(nodeId) });
  queryClient.invalidateQueries({
    queryKey: queryKeys.rgbContractsSynced(nodeId),
  });
}

/** Create an RGB onchain invoice. */
export function useRgbOnchainInvoiceCreateMutation(
  options?: Omit<
    UseMutationOptions<
      RgbOnchainInvoiceResponse,
      Error,
      { nodeId: string; request: RgbOnchainInvoiceCreateRequest }
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeRgbOnchainInvoiceCreate(nodeId, request),
    ...options,
  });
}

/**
 * Send an RGB onchain payment. Invalidates RGB onchain payments + contracts
 * since a successful transfer changes both balances and the payment list.
 */
export function useRgbOnchainSendMutation(
  options?: Omit<
    UseMutationOptions<
      RgbOnchainSendResponse,
      Error,
      {
        nodeId: string;
        request: { invoice: string; fee_rate_sats_per_vb: number };
      }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request }) => nodeRgbOnchainSend(nodeId, request),
    onSuccess: (...args) => {
      const { nodeId } = args[1];
      invalidateRgbOnchainState(queryClient, nodeId);
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/**
 * Accept an incoming RGB onchain payment: download the consignment from the
 * payer's link, then accept it against the receiver's invoice.
 */
export function useRgbOnchainTransferConsignmentAcceptMutation(
  options?: Omit<
    UseMutationOptions<
      { contract_id: string; amount: string },
      Error,
      { nodeId: string; consignmentLink: string; invoice: string }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: async ({ nodeId, consignmentLink, invoice }) => {
      const data = await downloadTransferConsignmentFromLink(
        nodeId,
        consignmentLink,
      );
      return nodeRgbOnchainTransferConsignmentAccept(
        nodeId,
        invoice,
        data.archive_base64,
      );
    },
    onSuccess: (...args) => {
      const { nodeId } = args[1];
      invalidateRgbOnchainState(queryClient, nodeId);
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/**
 * Download a consignment archive from a link without verifying (used by the
 * export flow to save the archive to disk). Returns the raw bundle.
 */
export function useDownloadConsignmentWithoutVerifyMutation(
  options?: Omit<
    UseMutationOptions<RgbContractsExportBundle, Error, string>,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: (fullLink: string) =>
      downloadTransferConsignmentFromLinkWithoutVerify(fullLink),
    ...options,
  });
}

/** Find an RGB onchain payment by invoice text. */
export function useRgbOnchainPaymentLookupMutation(
  options?: Omit<
    UseMutationOptions<
      RgbOnchainPaymentsResponse["payments"][number] | null,
      Error,
      { nodeId: string; invoice: string }
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: async ({ nodeId, invoice }) => {
      const data = await nodeRgbOnchainPayments(nodeId);
      return data.payments.find((item) => item.invoice?.trim() === invoice) ?? null;
    },
    ...options,
  });
}
