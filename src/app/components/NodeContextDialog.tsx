import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { NodeContext } from "@/lib/domain";
import { useEffect, useMemo, useState } from "react";

function defaultDraft(): NodeContext {
  const nodeId = globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}`;
  return {
    node_id: nodeId,
    display_name: "Local node",
    main_api_base_url: "http://127.0.0.1:8500/",
    main_api_token_file_path: null,
    control_api_base_url: "http://127.0.0.1:8550/",
    control_api_token_file_path: null,
    data_dir: null,
    p2p_listen: null,
    rgb_consignment_base_url: null,
    allow_non_loopback: false,
    network: "regtest"
  };
}

export function NodeContextDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSubmitting,
  submitError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: NodeContext | null;
  onSubmit: (context: NodeContext) => void;
  isSubmitting?: boolean;
  submitError?: string;
}) {
  const initialDraft = useMemo(() => initial ?? defaultDraft(), [initial]);
  const [draft, setDraft] = useState<NodeContext>(initialDraft);

  useEffect(() => {
    if (!open) return;
    setDraft(initialDraft);
  }, [initialDraft, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit node context" : "Add node context"}</DialogTitle>
          <DialogDescription>
            Configure main/control API endpoints. Tokens are read by the Rust backend only.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              value={draft.display_name}
              onChange={(e) => setDraft((d) => ({ ...d, display_name: e.currentTarget.value }))}
              placeholder="e.g. Alice node"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="node_id">Node ID</Label>
            <Input
              id="node_id"
              className="font-mono"
              value={draft.node_id}
              onChange={(e) => setDraft((d) => ({ ...d, node_id: e.currentTarget.value }))}
              placeholder="uuid"
              disabled={!!initial}
            />
            {initial ? <div className="text-xs ui-muted">Node ID is stable after creation.</div> : null}
          </div>

          <div className={cn("grid gap-2 rounded-lg border ui-border p-3")}>
            <div className="text-sm font-semibold">Main API</div>
            <div className="grid gap-2">
              <Label htmlFor="main_api_base_url">Base URL</Label>
              <Input
                id="main_api_base_url"
                className="font-mono"
                value={draft.main_api_base_url}
                onChange={(e) => setDraft((d) => ({ ...d, main_api_base_url: e.currentTarget.value }))}
                placeholder="http://127.0.0.1:8500/"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="main_api_token_file_path">Token file path (optional)</Label>
              <Input
                id="main_api_token_file_path"
                className="font-mono"
                value={draft.main_api_token_file_path ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    main_api_token_file_path: e.currentTarget.value.trim() ? e.currentTarget.value : null,
                  }))
                }
                placeholder="/path/to/http_token"
              />
            </div>
          </div>

          <div className={cn("grid gap-2 rounded-lg border ui-border p-3")}>
            <div className="text-sm font-semibold">Control API (optional)</div>
            <div className="grid gap-2">
              <Label htmlFor="control_api_base_url">Base URL</Label>
              <Input
                id="control_api_base_url"
                className="font-mono"
                value={draft.control_api_base_url ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    control_api_base_url: e.currentTarget.value.trim() ? e.currentTarget.value : null,
                  }))
                }
                placeholder="http://127.0.0.1:8550/"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="control_api_token_file_path">Token file path (optional)</Label>
              <Input
                id="control_api_token_file_path"
                className="font-mono"
                value={draft.control_api_token_file_path ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    control_api_token_file_path: e.currentTarget.value.trim() ? e.currentTarget.value : null,
                  }))
                }
                placeholder="/path/to/control_http_token"
              />
            </div>
          </div>

          <div className={cn("grid gap-2 rounded-lg border ui-border p-3")}>
            <div className="text-sm font-semibold">P2P (optional)</div>
            <div className="grid gap-2">
              <Label htmlFor="p2p_listen">Connect address</Label>
              <Input
                id="p2p_listen"
                className="font-mono"
                value={draft.p2p_listen ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    p2p_listen: e.currentTarget.value.trim() ? e.currentTarget.value : null,
                  }))
                }
                placeholder="rgb-node-alice:9735 or 127.0.0.1:9735"
              />
              <div className="text-xs ui-muted">
                Optional default peer address for this node (docker DNS for local nodes, host:port for external).
              </div>
            </div>
          </div>

          <div className={cn("grid gap-2 rounded-lg border ui-border p-3")}>
            <div className="text-sm font-semibold">RGB (optional)</div>
            <div className="grid gap-2">
              <Label htmlFor="rgb_consignment_base_url">Consignment base URL</Label>
              <Input
                id="rgb_consignment_base_url"
                className="font-mono"
                value={draft.rgb_consignment_base_url ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    rgb_consignment_base_url: e.currentTarget.value.trim() ? e.currentTarget.value : null,
                  }))
                }
                placeholder="http://rgb-node-alice:8500/api/v1/rgb/consignments/{txid}?format=zip"
              />
              <div className="text-xs ui-muted">
                Used for RGB channel open (color_context_data). Provide a template with {"{txid}"} (recommended) or a base ending in /consignments.
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="data_dir">Data dir (optional)</Label>
            <Input
              id="data_dir"
              className="font-mono"
              value={draft.data_dir ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, data_dir: e.currentTarget.value.trim() ? e.currentTarget.value : null }))}
              placeholder="/path/to/node/data"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="allow_non_loopback"
              checked={!!draft.allow_non_loopback}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, allow_non_loopback: v === true }))}
            />
            <Label htmlFor="allow_non_loopback">Allow non-loopback URLs (unsafe)</Label>
          </div>

          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>Failed to save</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={!!isSubmitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => onSubmit(draft)} disabled={!!isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
