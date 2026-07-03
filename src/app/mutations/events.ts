import {
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import {
  eventsClear,
  eventsHttpDebugSet,
  eventsStart,
  eventsStop,
} from "@/lib/commands";
import { queryKeys } from "@/app/queries/queryKeys";

function invalidateEvents(
  queryClient: ReturnType<typeof useQueryClient>,
  nodeId: string,
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.eventsStatus(nodeId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.eventsListAll(nodeId) });
}

export function useEventsStartMutation(
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: (nodeId: string) => eventsStart(nodeId),
    onSuccess: (...args) => {
      invalidateEvents(queryClient, args[1]);
      onSuccess?.(...args);
    },
    ...rest,
  });
}

export function useEventsStopMutation(
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: (nodeId: string) => eventsStop(nodeId),
    onSuccess: (...args) => {
      invalidateEvents(queryClient, args[1]);
      onSuccess?.(...args);
    },
    ...rest,
  });
}

export function useEventsClearMutation(
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: (nodeId: string) => eventsClear(nodeId),
    onSuccess: (...args) => {
      queryClient.setQueriesData({ queryKey: queryKeys.eventsListAll(args[1]) }, []);
      invalidateEvents(queryClient, args[1]);
      onSuccess?.(...args);
    },
    ...rest,
  });
}

export function useEventsHttpDebugSetMutation(
  options?: Omit<UseMutationOptions<void, Error, boolean>, "mutationFn">,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    mutationFn: (enabled: boolean) => eventsHttpDebugSet(enabled),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.eventsHttpDebug() });
      onSuccess?.(...args);
    },
    ...rest,
  });
}
