import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { eventsHttpDebugGet, eventsList, eventsStatus } from "@/lib/commands";
import type { EventsStatus, StoredEvent } from "@/lib/domain";
import { queryKeys } from "./queryKeys";
import { mergeNodeOptions } from "./internal";

type NodeOptions<T> = Omit<UseQueryOptions<T>, "queryKey" | "queryFn"> & {
  enabled?: boolean;
};

/** Tail of recent events for a node (backend buffer). */
export function useEventsListQuery(
  nodeId: string | null | undefined,
  limit?: number,
  options?: NodeOptions<StoredEvent[]>,
) {
  return useQuery({
    queryKey: queryKeys.eventsList(nodeId ?? "", limit),
    queryFn: () => eventsList(nodeId!, limit),
    ...mergeNodeOptions(nodeId, options),
  });
}

/** Whether the per-node event loop is running, plus last error. */
export function useEventsStatusQuery(
  nodeId: string | null | undefined,
  options?: NodeOptions<EventsStatus>,
) {
  return useQuery({
    queryKey: queryKeys.eventsStatus(nodeId ?? ""),
    queryFn: () => eventsStatus(nodeId!),
    ...mergeNodeOptions(nodeId, options),
  });
}

/** Whether the backend captures HTTP response bodies in the event stream. */
export function useEventsHttpDebugQuery(
  options?: Omit<UseQueryOptions<boolean>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: queryKeys.eventsHttpDebug(),
    queryFn: eventsHttpDebugGet,
    ...options,
  });
}
