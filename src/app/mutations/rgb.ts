import {
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import {
  nodeRgbContractBalance,
  nodeRgbContractExportBundle,
  nodeRgbContractImportBundle,
  nodeRgbContractIssue,
  nodeRgbLnInvoiceCreate,
  nodeRgbLnPay,
  pluginWalletAssetExport,
  nodeRgbSync,
} from "@/lib/commands";
import type { BitcoinNetwork, RgbContractsExportBundle } from "@/lib/domain";
import type {
  OkResponse,
  RgbContractBalanceResponse,
  RgbContractsImportResponse,
  RgbContractsIssueRequest,
  RgbContractsIssueResponse,
  RgbLnInvoiceCreateRequest,
  RgbLnInvoiceResponse,
  RgbLnPayRequest,
  SendResponse,
} from "@/lib/sdk/types";
import { queryKeys } from "@/app/queries/queryKeys";
import { getNetworkOption } from "@/app/config/networkOptions";
import { contextsList } from "@/lib/commands";

function invalidateRgbAssetState(
  queryClient: ReturnType<typeof useQueryClient>,
  nodeId: string,
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.rgbContracts(nodeId) });
  queryClient.invalidateQueries({
    queryKey: queryKeys.rgbContractsSynced(nodeId),
  });
  queryClient.invalidateQueries({ queryKey: ["rgb_utxos", nodeId] });
}

/** Sync RGB state; invalidates both contracts read paths. */
export function useRgbSyncMutation(
  options?: Omit<UseMutationOptions<OkResponse, Error, string>, "mutationFn">,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: (nodeId: string) => nodeRgbSync(nodeId),
    onSuccess: (...args) => {
      const nodeId = args[1];
      invalidateRgbAssetState(queryClient, nodeId);
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/** Issue a new RGB contract; invalidates the issuer node's contract list. */
export function useRgbContractIssueMutation(
  options?: Omit<
    UseMutationOptions<
      RgbContractsIssueResponse,
      Error,
      { nodeId: string; request: RgbContractsIssueRequest }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeRgbContractIssue(nodeId, request),
    onSuccess: (...args) => {
      const { nodeId } = args[1];
      invalidateRgbAssetState(queryClient, nodeId);
      queryClient.invalidateQueries({ queryKey: queryKeys.rgbIssuers(nodeId) });
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/** Export a contract bundle (raw read — no cache to invalidate). */
export function useRgbContractExportBundleMutation(
  options?: Omit<
    UseMutationOptions<
      RgbContractsExportBundle,
      Error,
      { nodeId: string; contractId: string; format?: "raw" | "gzip" | "zip" }
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, contractId, format }) =>
      nodeRgbContractExportBundle(nodeId, contractId, format),
    ...options,
  });
}

/** Import a contract bundle; invalidates the receiver's contract list. */
export function useRgbContractImportBundleMutation(
  options?: Omit<
    UseMutationOptions<
      RgbContractsImportResponse,
      Error,
      {
        nodeId: string;
        contractId: string;
        archiveBase64: string;
        format?: "raw" | "gzip" | "zip";
      }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, contractId, archiveBase64, format }) =>
      nodeRgbContractImportBundle(nodeId, contractId, archiveBase64, format),
    onSuccess: (...args) => {
      const { nodeId } = args[1];
      invalidateRgbAssetState(queryClient, nodeId);
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/** Read-only contract balance query — no cache invalidation. */
export function useRgbContractBalanceMutation(
  options?: Omit<
    UseMutationOptions<
      RgbContractBalanceResponse,
      Error,
      { nodeId: string; contractId: string }
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, contractId }) =>
      nodeRgbContractBalance(nodeId, contractId),
    ...options,
  });
}

/** Create an RGB Lightning invoice. */
export function useRgbLnInvoiceCreateMutation(
  options?: Omit<
    UseMutationOptions<
      RgbLnInvoiceResponse,
      Error,
      { nodeId: string; request: RgbLnInvoiceCreateRequest }
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, request }) =>
      nodeRgbLnInvoiceCreate(nodeId, request),
    ...options,
  });
}

/** Pay an RGB Lightning invoice. */
export function useRgbLnPayMutation(
  options?: Omit<
    UseMutationOptions<
      SendResponse,
      Error,
      { nodeId: string; request: RgbLnPayRequest }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, request }) => nodeRgbLnPay(nodeId, request),
    onSuccess: (...args) => {
      const { nodeId } = args[1];
      queryClient.invalidateQueries({ queryKey: queryKeys.nodePayments(nodeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.nodeBalances(nodeId) });
      invalidateRgbAssetState(queryClient, nodeId);
      onSuccess?.(...args);
    },
    ...rest,
  });
}

/** Import a contract through the plugin exporter based on the active node network. */
export function useRgbContractImportFromPluginMutation(
  options?: Omit<
    UseMutationOptions<
      string,
      Error,
      { nodeId: string; contractId: string }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: async ({ nodeId, contractId }) => {
      const list = await contextsList();
      const node = list.find((context) => context.node_id === nodeId);
      if (!node) {
        throw new Error("Node not found");
      }
      const config = getNetworkOption(node.network as BitcoinNetwork);
      if (!config) {
        throw new Error("Network not supported");
      }
      const contract = await pluginWalletAssetExport(
        nodeId,
        contractId,
        config.coreUrl,
      );
      if (!contract.archive_base64) {
        throw new Error(
          (contract as { message?: string }).message ??
            "Failed to download contract",
        );
      }
      await nodeRgbContractImportBundle(
        nodeId,
        contractId,
        contract.archive_base64,
      );
      return contractId;
    },
    onSuccess: (...args) => {
      const { nodeId } = args[1];
      invalidateRgbAssetState(queryClient, nodeId);
      onSuccess?.(...args);
    },
    ...rest,
  });
}
