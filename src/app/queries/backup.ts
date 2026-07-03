import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  walletShowMnemonicCli,
  type WalletShowMnemonicResponse,
} from "@/lib/commands";
import { queryKeys } from "./queryKeys";
import { queryClient } from "@/app/queryClient";

type NodeOptions<T> = Omit<UseQueryOptions<T>, "queryKey" | "queryFn"> & {
  enabled?: boolean;
};

/**
 * Sensitive: reveal a node's stored BIP39 mnemonic.
 *
 * Defaults to `enabled: false` + `staleTime: Infinity` + `retry: false` so the
 * mnemonic is ONLY fetched when the caller explicitly calls `.refetch()`, and
 * never auto-refreshes / re-polls. Callers should `queryClient.removeQueries`
 * (or `setQueryData`) to clear it from memory as soon as the reveal UI closes.
 */
export function useWalletShowMnemonicQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<WalletShowMnemonicResponse>,
) {
  return useQuery({
    queryKey: queryKeys.mnemonic(nodeId ?? ""),
    queryFn: () => {
      if (!nodeId) {
        throw new Error("Missing node id");
      }
      return walletShowMnemonicCli(nodeId, true);
    },
    enabled: false,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    ...options,
  });
}

export function removeWalletShowMnemonicQuery(
  nodeId: string | null | undefined,
) {
  queryClient.removeQueries({ queryKey: queryKeys.mnemonic(nodeId ?? "") });
}
