import type { UseQueryOptions } from "@tanstack/react-query";

/**
 * Merges a caller's per-query options with the default "disabled when there
 * is no nodeId" rule.
 *
 * - If the caller passes `options.enabled`, that wins (it lets pages gate the
 *   query on their own conditions, e.g. `open && rgbEnabled`).
 * - Otherwise the query runs only when `nodeId` is truthy.
 *
 * `extraEnabled` is AND-ed on top for payload-based queries (decode hooks),
 * so an empty payload never triggers a network call.
 */
export function mergeNodeOptions<T>(
  nodeId: string | null | undefined,
  options?:
    | (Omit<UseQueryOptions<T>, "queryKey" | "queryFn"> & {
        enabled?: boolean;
      })
    | undefined,
  extraEnabled?: boolean,
) {
  const callerEnabled = options?.enabled;
  const hasNodeId = !!nodeId;
  const hasPayload = extraEnabled ?? true;

  const enabled =
    callerEnabled === undefined
      ? hasNodeId && hasPayload
      : callerEnabled && hasNodeId && hasPayload;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { enabled: _omit, ...rest } = options ?? {};
  return { enabled, ...rest };
}
