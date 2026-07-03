import { Button } from "@/components/ui/button";
import { openPath } from "@tauri-apps/plugin-opener";
import { useContextsPathQuery, useLogsPathQuery } from "@/app/queries";
import { getDirname } from "@/lib/utils";
import { FolderOpen } from "lucide-react";
import CopyButton from "@/app/components/CopyButton";

export default function SettingsPage() {
  const logsPathQuery = useLogsPathQuery();
  const contextsPathQuery = useContextsPathQuery();

  return (
    <div className="w-full">
      <h4 className="text-xl leading-7 font-bold">Data</h4>
      <div className="text-base mt-3 text-secondary-foreground">Manage local data paths, application contexts, and system logs.</div>
      <div className="mt-8 space-y-8">
        <div>
          <h4 className="text-base">Contexts</h4>
          <div className="mt-1 text-xs text-secondary-foreground">Node contexts are read from this JSON file.</div>
          <div className="mt-3 bg-background-4 rounded-2xl p-4">
            <p className="text-base">
              {contextsPathQuery.data ?? "Loading…"}
            </p>
            <div className="mt-4 flex gap-2">
              <CopyButton
                size="default"
                value={contextsPathQuery.data ?? ""}
              />
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
                Open
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
              <CopyButton
                size="default"
                value={logsPathQuery.data ?? ''}
              />
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
                Open
              </Button>
              {/* <Button
                variant="destructive"
                className="rounded-full"
                onClick={async () => {
                  await logUi("info", "ui.test_log", { ts_ms: Date.now() });
                }}
                type="button"
              >
                <IconFile />
                <span>Write Test Log</span>
              </Button> */}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
