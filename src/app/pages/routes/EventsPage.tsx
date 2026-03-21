import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNodeStore } from "@/app/stores/nodeStore";
import type { StoredEvent } from "@/lib/domain";
import {
  eventsClear,
  eventsHttpDebugGet,
  eventsHttpDebugSet,
  eventsList,
  eventsStart,
  eventsStatus,
  eventsStop,
  nodeMainStatus,
} from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";

type EventGroup =
  | "payment"
  | "channel"
  | "status"
  | "http_request"
  | "http_response"
  | "http_error"
  | "other";

const GROUP_LABELS: Record<EventGroup, string> = {
  http_request: "HTTP Request",
  http_response: "HTTP Response",
  payment: "Payment",
  channel: "Channel",
  status: "Status",
  http_error: "HTTP Error",
  other: "Other",
};

const STATUS_ACTIONS = new Set(["main.healthz", "main.status", "main.readyz"]);

function isStatusAction(action: string): boolean {
  return STATUS_ACTIONS.has(action);
}

function classifyEventGroup(ev: StoredEvent): EventGroup {
  if (
    ev.event.type === "PaymentSuccessful" ||
    ev.event.type === "PaymentFailed" ||
    ev.event.type === "PaymentReceived"
  ) {
    return "payment";
  }
  if (
    ev.event.type === "ChannelPending" ||
    ev.event.type === "ChannelReady" ||
    ev.event.type === "ChannelClosed"
  ) {
    return "channel";
  }
  if (ev.event.type === "NodeHttp") {
    if (ev.event.data.phase === "error") return "http_error";
    if (isStatusAction(ev.event.data.action)) return "status";
    if (ev.event.data.phase === "request") return "http_request";
    return "http_response";
  }
  return "other";
}

function summarizeEvent(ev: StoredEvent): string {
  if (ev.event.type === "NodeHttp") {
    const action = ev.event.data.action;
    const phase = ev.event.data.phase;
    const duration =
      typeof ev.event.data.duration_ms === "number"
        ? ` ${ev.event.data.duration_ms}ms`
        : "";
    return `${action} · ${phase}${duration}`;
  }
  return ev.event.type;
}

function typeKeyOf(ev: StoredEvent): string {
  if (ev.event.type !== "NodeHttp") {
    return ev.event.type;
  }
  return `${ev.event.type}/${ev.event.data.action}/${ev.event.data.phase}`;
}

export function EventsPage() {
  const queryClient = useQueryClient();
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const [tailLimit, setTailLimit] = useState(200);
  const [tailFilter, setTailFilter] = useState("");
  const [tailFollow, setTailFollow] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [enabledGroups, setEnabledGroups] = useState<
    Record<EventGroup, boolean>
  >({
    payment: false,
    channel: false,
    status: false,
    http_request: true,
    http_response: true,
    http_error: false,
    other: false,
  });

  const eventsStatusQuery = useQuery({
    queryKey: ["events_status", activeNodeId],
    queryFn: () => eventsStatus(activeNodeId!),
    enabled: !!activeNodeId,
    refetchInterval: 5_000,
  });

  const eventsListQuery = useQuery({
    queryKey: ["events_list", activeNodeId, tailLimit],
    queryFn: () => eventsList(activeNodeId!, tailLimit),
    enabled: !!activeNodeId,
    refetchInterval: tailFollow ? 5_000 : false,
  });

  const mainStatusQuery = useQuery({
    queryKey: ["events_main_status", activeNodeId],
    queryFn: () => nodeMainStatus(activeNodeId!),
    refetchInterval: 5_000,
    enabled: !!activeNodeId,
  });

  if (!activeNodeId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">No active node</CardTitle>
        </CardHeader>
        <CardContent className="text-sm ui-muted">
          Select a node from the header selector.
        </CardContent>
      </Card>
    );
  }

  const locked =
    !!mainStatusQuery.data &&
    typeof mainStatusQuery.data === "object" &&
    "locked" in mainStatusQuery.data &&
    (mainStatusQuery.data as { locked?: boolean }).locked === true;

  const lastError =
    eventsStatusQuery.data?.last_error?.code === "node_locked"
      ? null
      : eventsStatusQuery.data?.last_error;

  const httpDebugQuery = useQuery({
    queryKey: ["events_http_debug"],
    queryFn: eventsHttpDebugGet,
  });

  const parsedEvents = useMemo(() => {
    const filter = tailFilter.trim().toLowerCase();
    const typeFilterText = typeFilter.trim().toLowerCase();
    const events = eventsListQuery.data ?? [];
    return events
      .map((ev) => {
        const raw = JSON.stringify(ev);
        const group = classifyEventGroup(ev);
        const typeKey = typeKeyOf(ev);
        const summary = summarizeEvent(ev);
        return {
          raw,
          event: ev,
          ts: new Date(ev.received_at_ms).toLocaleString(),
          type: ev.event.type,
          typeKey,
          summary,
          group,
          data: ev.event.data,
        };
      })
      .filter((e) => {
        if (!enabledGroups[e.group]) return false;
        if (!filter) return true;
        return (
          e.raw.toLowerCase().includes(filter) ||
          e.summary.toLowerCase().includes(filter)
        );
      })
      .filter((e) => {
        if (!typeFilterText) return true;
        return e.typeKey.toLowerCase().includes(typeFilterText);
      });
  }, [eventsListQuery.data, enabledGroups, tailFilter, typeFilter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Events</CardTitle>
        <CardDescription>
          Consumed by Rust backend (single loop per node)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                eventsStatusQuery.data?.running ? "success" : "secondary"
              }
            >
              {eventsStatusQuery.data?.running ? "RUNNING" : "STOPPED"}
            </Badge>
            <Badge variant={locked ? "warning" : "success"}>
              {locked ? "LOCKED" : "UNLOCKED"}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={async () => {
                await eventsClear(activeNodeId);
                queryClient.setQueryData<StoredEvent[]>(
                  ["events_list", activeNodeId],
                  []
                );
              }}
            >
              Clear
            </Button>
            <Button
              variant={
                eventsStatusQuery.data?.running ? "secondary" : "default"
              }
              size="sm"
              type="button"
              disabled={eventsStatusQuery.isLoading}
              onClick={async () => {
                if (eventsStatusQuery.data?.running) {
                  await eventsStop(activeNodeId);
                } else {
                  await eventsStart(activeNodeId);
                }
                await Promise.all([
                  eventsStatusQuery.refetch(),
                  eventsListQuery.refetch(),
                ]);
              }}
            >
              {eventsStatusQuery.data?.running ? "Stop Events" : "Start Events"}
            </Button>
          </div>
        </div>

        {eventsListQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Failed to load events</AlertTitle>
            <AlertDescription>
              {errorToText(eventsListQuery.error)}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="text-sm font-semibold">Event tail</div>
                <div className="text-xs ui-muted">
                  Last {tailLimit} events from backend buffer. Polling every 5s.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-md border ui-border px-2 py-1">
                  <Checkbox
                    id="events_follow"
                    checked={tailFollow}
                    onCheckedChange={(v) => setTailFollow(v === true)}
                  />
                  <label htmlFor="events_follow" className="text-xs ui-muted">
                    Follow
                  </label>
                </div>
                <div className="flex items-center gap-2 rounded-md border ui-border px-2 py-1">
                  <Checkbox
                    id="events_capture_response"
                    checked={httpDebugQuery.data === true}
                    onCheckedChange={async (v) => {
                      await eventsHttpDebugSet(v === true);
                      await Promise.all([
                        httpDebugQuery.refetch(),
                        eventsListQuery.refetch(),
                      ]);
                    }}
                  />
                  <label
                    htmlFor="events_capture_response"
                    className="text-xs ui-muted"
                  >
                    Capture response
                  </label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => eventsListQuery.refetch()}
                >
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className="grid gap-1">
                <div className="text-xs ui-muted">Filter</div>
                <Input
                  value={tailFilter}
                  onChange={(e) => setTailFilter(e.currentTarget.value)}
                  placeholder="Search events..."
                />
              </div>
              <div className="grid gap-1">
                <div className="text-xs ui-muted">Type contains</div>
                <Input
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.currentTarget.value)}
                  placeholder="e.g. NodeHttp/main.status/error"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs ui-muted">Event groups</div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(GROUP_LABELS) as EventGroup[]).map((group) => (
                  <Button
                    key={group}
                    type="button"
                    size="sm"
                    variant={enabledGroups[group] ? "default" : "outline"}
                    onClick={() => {
                      setEnabledGroups((prev) => ({
                        ...prev,
                        [group]: !prev[group],
                      }));
                    }}
                  >
                    {GROUP_LABELS[group]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className="grid gap-1">
                <div className="text-xs ui-muted">Limit</div>
                <Input
                  value={String(tailLimit)}
                  onChange={(e) => {
                    const raw = e.currentTarget.value.trim();
                    if (!raw) return;
                    const n = Number(raw);
                    if (!Number.isFinite(n)) return;
                    setTailLimit(Math.max(10, Math.min(1000, Math.floor(n))));
                  }}
                  inputMode="numeric"
                  className="font-mono"
                />
              </div>
            </div>

            <ScrollArea className="h-[480px] rounded-md border ui-border ui-muted-10">
              <div className="space-y-1 p-2 font-mono text-xs">
                {eventsListQuery.isLoading ? (
                  <div className="ui-muted">Loading...</div>
                ) : parsedEvents.length === 0 ? (
                  <div className="ui-muted">
                    {tailFilter.trim() ? "No matches." : "No events yet."}
                  </div>
                ) : (
                  parsedEvents.map((entry, idx) => {
                    const type = entry.type;
                    const badgeVariant:
                      | "destructive"
                      | "secondary"
                      | "outline" =
                      entry.group === "http_error" || type === "PaymentFailed"
                        ? "destructive"
                        : type === "NodeHttp"
                        ? "secondary"
                        : "outline";
                    return (
                      <details
                        key={`${entry.event.received_at_ms}-${idx}`}
                        className="rounded-md border ui-border ui-border-weak ui-surface-40 px-2 py-1"
                      >
                        <summary className="cursor-pointer select-none">
                          <span className="mr-2 inline-flex items-center gap-2">
                            <Badge
                              variant={badgeVariant}
                              className="px-1.5 py-0 text-[10px]"
                            >
                              {type}
                            </Badge>
                            <span className="ui-muted">{entry.ts}</span>
                          </span>
                          <span className="break-words">{entry.summary}</span>
                        </summary>
                        <div className="mt-2 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={async () => {
                                await navigator.clipboard.writeText(entry.raw);
                              }}
                            >
                              Copy JSON
                            </Button>
                          </div>
                          <pre className="max-h-64 overflow-auto rounded-md border ui-border ui-muted-30 p-2">
                            {JSON.stringify(entry.data, null, 2)}
                          </pre>
                        </div>
                      </details>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
