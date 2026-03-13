import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNodeStore } from "@/app/stores/nodeStore";
import type { StoredEvent } from "@/lib/domain";
import { eventsClear, eventsList, eventsStatus, nodeMainStatus } from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";

export function EventsPage() {
  const queryClient = useQueryClient();
  const activeNodeId = useNodeStore((s) => s.activeNodeId);

  const eventsStatusQuery = useQuery({
    queryKey: ["events_status", activeNodeId],
    queryFn: () => eventsStatus(activeNodeId!),
    enabled: !!activeNodeId,
    refetchInterval: 2_000,
  });

  const eventsListQuery = useQuery({
    queryKey: ["events_list", activeNodeId],
    queryFn: () => eventsList(activeNodeId!, 200),
    enabled: !!activeNodeId,
    refetchInterval: eventsStatusQuery.data?.running ? 2_000 : false,
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

  const events = eventsListQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Events</CardTitle>
        <CardDescription>Consumed by Rust backend (single loop per node)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={eventsStatusQuery.data?.running ? "success" : "secondary"}>
              {eventsStatusQuery.data?.running ? "RUNNING" : "STOPPED"}
            </Badge>
            <Badge variant={locked ? "warning" : "success"}>
              {locked ? "LOCKED" : "UNLOCKED"}
            </Badge>
            {lastError?.message ? (
              <span className="text-sm ui-danger">{lastError.message}</span>
            ) : (
              <span className="text-sm ui-muted">No errors</span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={async () => {
              await eventsClear(activeNodeId);
              queryClient.setQueryData<StoredEvent[]>(["events_list", activeNodeId], []);
            }}
          >
            Clear
          </Button>
        </div>

        {eventsListQuery.isLoading ? (
          <div className="text-sm ui-muted">Loading...</div>
        ) : eventsListQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Failed to load events</AlertTitle>
            <AlertDescription>{errorToText(eventsListQuery.error)}</AlertDescription>
          </Alert>
        ) : events.length === 0 ? (
          <div className="text-sm ui-muted">No events yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((ev, idx) => (
                <TableRow key={`${ev.received_at_ms}-${idx}`}>
                  <TableCell className="font-medium">{ev.event.type}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {ev.received_at_ms}
                  </TableCell>
                  <TableCell>
                    <pre className="max-h-48 overflow-auto rounded-md ui-muted-30 p-2 text-xs">
                      {JSON.stringify(ev.event.data, null, 2)}
                    </pre>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

