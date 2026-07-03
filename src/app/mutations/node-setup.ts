import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import {
  backupInspectArchiveCli,
  backupExportCli,
  backupImportCli,
  nodeRunCli,
  prepareNodeResources,
  walletInitCli,
  type BackupInspectResponse,
  type BackupExportResponse,
  type BackupImportResponse,
  type NodeRunResponse,
  type WalletInitResponse,
} from "@/lib/commands";
import type { BootstrapLocalNodeRequest, NodeContext } from "@/lib/domain";

/**
 * Step 1 of the node setup/recovery flow: allocate ports, secrets, data
 * volume and persist the NodeContext. Does not start any container.
 */
export function usePrepareNodeResourcesMutation(
  options?: Omit<
    UseMutationOptions<NodeContext, Error, BootstrapLocalNodeRequest | undefined>,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: (request) => prepareNodeResources(request),
    ...options,
  });
}

/** Step 2/3: write the keystore into the data volume using a mnemonic. */
export function useWalletInitCliMutation(
  options?: Omit<
    UseMutationOptions<
      WalletInitResponse,
      Error,
      { nodeId: string; mnemonic: string; image?: string }
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, mnemonic, image }) =>
      walletInitCli(nodeId, mnemonic, image),
    ...options,
  });
}

/** Step 4: start (or restart) the daemon container. */
export function useNodeRunCliMutation(
  options?: Omit<
    UseMutationOptions<NodeRunResponse, Error, { nodeId: string; image?: string }>,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, image }) => nodeRunCli(nodeId, image),
    ...options,
  });
}

/** Restore a node's data-dir from a backup archive. */
export function useBackupImportCliMutation(
  options?: Omit<
    UseMutationOptions<
      BackupImportResponse,
      Error,
      {
        nodeId: string;
        archivePath: string;
        autoStop: boolean;
        image?: string;
        network?: string;
      }
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, archivePath, autoStop, image, network }) =>
      backupImportCli(nodeId, archivePath, autoStop, image, network),
    ...options,
  });
}

/** Export the node's data-dir as a backup archive. */
export function useBackupExportCliMutation(
  options?: Omit<
    UseMutationOptions<
      BackupExportResponse,
      Error,
      { nodeId: string; outputPath: string; image?: string; network?: string }
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ nodeId, outputPath, image, network }) =>
      backupExportCli(nodeId, outputPath, image, network),
    ...options,
  });
}

/** Preview a backup archive manifest before the restore flow creates a node. */
export function useBackupInspectArchiveCliMutation(
  options?: Omit<
    UseMutationOptions<
      BackupInspectResponse,
      Error,
      { image: string; archivePath: string }
    >,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: ({ image, archivePath }) =>
      backupInspectArchiveCli(image, archivePath),
    ...options,
  });
}
