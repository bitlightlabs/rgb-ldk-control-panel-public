import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  contextsList,
  contextsPath,
  dockerEnvironment,
  logsPath,
} from "@/lib/commands";
import type {
  DockerEnvironmentResponse,
  NodeContext,
} from "@/lib/domain";
import { queryKeys } from "./queryKeys";

/** List of all persisted node contexts (contexts.json). */
export function useContextsQuery(
  options?: Omit<
    UseQueryOptions<NodeContext[]>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: queryKeys.contexts(),
    queryFn: contextsList,
    ...options,
  });
}

/** Absolute path to the contexts.json directory. */
export function useContextsPathQuery(
  options?: Omit<UseQueryOptions<string>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: queryKeys.contextsPath(),
    queryFn: contextsPath,
    ...options,
  });
}

/** Absolute path to the UI logs file. */
export function useLogsPathQuery(
  options?: Omit<UseQueryOptions<string>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: queryKeys.logsPath(),
    queryFn: logsPath,
    ...options,
  });
}

/** Docker installation / daemon status on the host. */
export function useDockerEnvironmentQuery(
  options?: Omit<
    UseQueryOptions<DockerEnvironmentResponse>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: queryKeys.dockerEnvironment(),
    queryFn: dockerEnvironment,
    ...options,
  });
}
