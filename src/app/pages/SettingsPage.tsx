import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { openPath } from "@tauri-apps/plugin-opener";
import { contextsPath, logUi, logsPath, logsTail } from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";

export function SettingsPage() {
  const logsPathQuery = useQuery({
    queryKey: ["logs_path"],
    queryFn: logsPath,
  });
  const contextsPathQuery = useQuery({
    queryKey: ["contexts_path"],
    queryFn: contextsPath,
  });

  const [tailLimit, setTailLimit] = useState(200);
  const [tailFilter, setTailFilter] = useState("");
  const [tailFollow, setTailFollow] = useState(true);

  const logsTailQuery = useQuery({
    queryKey: ["logs_tail", tailLimit],
    queryFn: () => logsTail(tailLimit),
    refetchInterval: tailFollow ? 2_000 : false,
  });

  const parsedTail = useMemo(() => {
    const filter = tailFilter.trim().toLowerCase();
    const lines = logsTailQuery.data ?? [];
    const entries = lines
      .map((raw) => {
        try {
          const json = JSON.parse(raw) as any;
          return {
            raw,
            ts_ms: typeof json?.ts_ms === "number" ? (json.ts_ms as number) : null,
            level: typeof json?.level === "string" ? (json.level as string) : null,
            source: typeof json?.source === "string" ? (json.source as string) : null,
            message: typeof json?.message === "string" ? (json.message as string) : raw,
            context: json?.context ?? null,
          };
        } catch {
          return { raw, ts_ms: null, level: null, source: null, message: raw, context: null };
        }
      })
      .filter((e) => {
        if (!filter) return true;
        return e.raw.toLowerCase().includes(filter);
      });
    return entries;
  }, [logsTailQuery.data, tailFilter]);

  return (
    <Card className="ui-bg ui-foreground">
      <CardHeader>
        <CardTitle className="text-sm">Settings</CardTitle>
        <CardDescription>Logging and local-only safety defaults</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="space-y-2">
          <div className="text-sm font-semibold">Contexts</div>
          <div className="flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded-md border ui-border ui-muted-30 px-2 py-1 text-xs">
              {contextsPathQuery.data ?? "Loading…"}
            </code>
            <Button
              variant="outline"
              size="sm"
              disabled={!contextsPathQuery.data}
              onClick={async () => {
                if (!contextsPathQuery.data) return;
                await navigator.clipboard.writeText(contextsPathQuery.data);
              }}
              type="button"
            >
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!contextsPathQuery.data}
              onClick={async () => {
                if (!contextsPathQuery.data) return;
                await openPath(contextsPathQuery.data);
              }}
              type="button"
            >
              Open
            </Button>
          </div>
          <div className="text-sm ui-muted">Node contexts are read from this JSON file.</div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="text-sm font-semibold">Logs</div>
          <div className="flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded-md border ui-border ui-muted-30 px-2 py-1 text-xs">
              {logsPathQuery.data ?? "Loading…"}
            </code>
            <Button
              variant="outline"
              size="sm"
              disabled={!logsPathQuery.data}
              onClick={async () => {
                if (!logsPathQuery.data) return;
                await navigator.clipboard.writeText(logsPathQuery.data);
              }}
              type="button"
            >
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!logsPathQuery.data}
              onClick={async () => {
                if (!logsPathQuery.data) return;
                await openPath(logsPathQuery.data);
              }}
              type="button"
            >
              Open
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                await logUi("info", "ui.test_log", { ts_ms: Date.now() });
              }}
              type="button"
            >
              Write test log
            </Button>
          </div>
          <div className="text-sm ui-muted">
            UI errors (unhandled exceptions/rejections) are forwarded to the backend and appended as JSONL.
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="text-sm font-semibold">Log tail</div>
              <div className="text-xs ui-muted">Last {tailLimit} lines from the JSONL log file.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border ui-border px-2 py-1">
                <Checkbox id="tail_follow" checked={tailFollow} onCheckedChange={(v) => setTailFollow(v === true)} />
                <label htmlFor="tail_follow" className="text-xs ui-muted">
                  Follow
                </label>
              </div>
              <Button variant="outline" size="sm" type="button" onClick={() => logsTailQuery.refetch()}>
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="grid gap-1">
              <div className="text-xs ui-muted">Filter</div>
              <Input value={tailFilter} onChange={(e) => setTailFilter(e.currentTarget.value)} placeholder="Search logs…" />
            </div>
            <div className="grid gap-1">
              <div className="text-xs ui-muted">Limit</div>
              <Input
                value={String(tailLimit)}
                onChange={(e) => {
                  const raw = e.currentTarget.value.trim();
                  if (!raw) return;
                  const n = Number(raw);
                  if (!Number.isFinite(n)) return;
                  setTailLimit(Math.max(10, Math.min(2000, Math.floor(n))));
                }}
                inputMode="numeric"
                className="font-mono"
              />
            </div>
          </div>

          {logsTailQuery.isError ? (
            <div className="text-sm ui-danger">{errorToText(logsTailQuery.error)}</div>
          ) : null}

          <ScrollArea className="h-[420px] rounded-md border ui-border ui-muted-10">
            <div className="space-y-1 p-2 font-mono text-xs">
              {logsTailQuery.isLoading ? (
                <div className="ui-muted">Loading...</div>
              ) : parsedTail.length === 0 ? (
                <div className="ui-muted">{tailFilter.trim() ? "No matches." : "No logs yet."}</div>
              ) : (
                parsedTail.map((e, idx) => {
                  const ts = e.ts_ms ? new Date(e.ts_ms).toLocaleString() : null;
                  const level = (e.level ?? "").toLowerCase();
                  const badgeVariant: "destructive" | "secondary" | "outline" =
                    level === "error" ? "destructive" : level === "warn" ? "secondary" : "outline";
                  return (
                    <details key={`${idx}-${e.raw.slice(0, 16)}`} className="rounded-md border ui-border ui-border-weak ui-surface-40 px-2 py-1">
                      <summary className="cursor-pointer select-none">
                        <span className="mr-2 inline-flex items-center gap-2">
                          <Badge variant={badgeVariant} className="px-1.5 py-0 text-[10px]">
                            {level || "log"}
                          </Badge>
                          <span className="ui-muted">{e.source ?? "—"}</span>
                          {ts ? <span className="ui-muted">{ts}</span> : null}
                        </span>
                        <span className="break-words">{e.message}</span>
                      </summary>
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={async () => {
                              await navigator.clipboard.writeText(e.raw);
                            }}
                          >
                            Copy JSON
                          </Button>
                        </div>
                        {e.context ? (
                          <pre className="max-h-64 overflow-auto rounded-md border ui-border ui-muted-30 p-2">
                            {JSON.stringify(e.context, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    </details>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <Separator />

        <div className="text-sm ui-muted">
          Phase 0 remains local-only. Token sources are file-based (backend reads per request).
        </div>
      </CardContent>
    </Card>
  );
}
