import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { openPath } from "@tauri-apps/plugin-opener";
import { contextsPath, logUi, logsPath, logsTail } from "@/lib/commands";
import { getDirname } from "@/lib/utils";
import { Copy, FolderOpen } from "lucide-react";
import IconFile from "@/app/icons/file";

export default function SettingsPage() {
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
    <div className="w-full">
      <h4 className="text-xl leading-7 font-bold">Data</h4>
      <div className="text-base mt-3 text-secondary-foreground">Manage local data paths, application contexts, and system logs.</div>
      <div className="mt-3 space-y-8">
        <div>
          <h4 className="text-base">Contexts</h4>
          <div className="mt-1 text-xs text-secondary-foreground">Node contexts are read from this JSON file.</div>
          <div className="mt-3 bg-background-4 rounded-2xl p-4">
            <p className="text-base">
              {contextsPathQuery.data ?? "Loading…"}
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="destructive"
                className="rounded-full"
                disabled={!contextsPathQuery.data}
                onClick={async () => {
                  if (!contextsPathQuery.data) return;
                  await navigator.clipboard.writeText(contextsPathQuery.data);
                }}
                type="button"
              >
                <Copy />
                <span>Copy</span>
              </Button>
              <Button
                variant="destructive"
                className="rounded-full"
                disabled={!contextsPathQuery.data}
                onClick={async () => {
                  if (!contextsPathQuery.data) return;
                  const dir = getDirname(contextsPathQuery.data)
                  await openPath(dir);
                }}
                type="button"
              >
                <FolderOpen />
                <span>Open</span>
              </Button>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-base">Logs</h4>
          <div className="text-xs mt-1 text-secondary-foreground">UI errors (unhandled exceptions/rejections) are forwarded to the backend and appended as JSONL.</div>
          <div className="mt-3 bg-background-4 rounded-2xl p-4">
            <p className="text-base">
              {logsPathQuery.data ?? "Loading…"}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="destructive"
                className="rounded-full"
                disabled={!logsPathQuery.data}
                onClick={async () => {
                  if (!logsPathQuery.data) return;
                  await navigator.clipboard.writeText(logsPathQuery.data);
                }}
                type="button"
              >
                <Copy />
                <span>Copy</span>
              </Button>
              <Button
                variant="destructive"
                className="rounded-full"
                disabled={!logsPathQuery.data}
                onClick={async () => {
                  if (!logsPathQuery.data) return;
                  const dir = getDirname(logsPathQuery.data)
                  await openPath(dir);
                }}
                type="button"
              >
                <FolderOpen />
                <span>Open</span>
              </Button>
              <Button
                variant="destructive"
                className="rounded-full"
                onClick={async () => {
                  await logUi("info", "ui.test_log", { ts_ms: Date.now() });
                }}
                type="button"
              >
                <IconFile />
                <span>Write Test Log</span>
              </Button>
             </div>
          </div>
        </div>

        {/* <div className="space-y-3">
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
        </div> */}
      </div>
    </div>
  );
}
