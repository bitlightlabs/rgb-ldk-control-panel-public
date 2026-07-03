import {
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { nodeRgbIssuersImport } from "@/lib/commands";
import type { RgbContractsImportResponse } from "@/lib/sdk/types";
import { queryKeys } from "@/app/queries/queryKeys";

/**
 * Import an issuer archive. The caller is expected to read the file into a
 * Uint8Array (e.g. via Tauri FS) and pass the bytes here. Invalidates the
 * issuers list on success.
 */
export function useRgbIssuersImportMutation(
  options?: Omit<
    UseMutationOptions<
      RgbContractsImportResponse,
      Error,
      {
        nodeId: string;
        name: string;
        fileData: Uint8Array;
        format?: "raw" | "gzip" | "zip";
      }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: ({ nodeId, name, fileData, format }) =>
      nodeRgbIssuersImport(nodeId, name, fileData, format),
    onSuccess: (...args) => {
      const { nodeId } = args[1];
      queryClient.invalidateQueries({ queryKey: queryKeys.rgbIssuers(nodeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.rgbContracts(nodeId) });
      onSuccess?.(...args);
    },
    ...rest,
  });
}
