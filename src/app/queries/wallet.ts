import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { walletRecommendedFees } from "@/lib/commands";
import { queryKeys } from "./queryKeys";

type WalletRecommendedFeesResult = Awaited<
  ReturnType<typeof walletRecommendedFees>
>;

export function useWalletRecommendedFeesQuery(
  rpc: string | null | undefined,
  options?: Omit<
    UseQueryOptions<WalletRecommendedFeesResult>,
    "queryKey" | "queryFn"
  > & {
    enabled?: boolean;
  },
) {
  const enabled = (options?.enabled ?? true) && !!rpc;
  const { enabled: _omit, ...rest } = options ?? {};

  return useQuery({
    queryKey: queryKeys.walletRecommendedFees(rpc ?? ""),
    queryFn: () => walletRecommendedFees(rpc!),
    enabled,
    ...rest,
  });
}
