import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { NodeContext } from "@/lib/domain";
import { nodeBolt11Receive, nodeBolt11Send, nodePaymentWait } from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { u64 } from "@/lib/sdk";

function isDigits(s: string): boolean {
  return /^[0-9]+$/.test(s.trim());
}

export function TransferDialog({
  open,
  onOpenChange,
  contexts,
  defaultPayerNodeId,
  eventsRunning,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contexts: NodeContext[];
  defaultPayerNodeId: string;
  eventsRunning: boolean;
}) {
  const [payerNodeId, setPayerNodeId] = useState<string>(defaultPayerNodeId);
  const [payeeNodeId, setPayeeNodeId] = useState<string | null>(null);

  const payer = useMemo(() => contexts.find((c) => c.node_id === payerNodeId) ?? null, [contexts, payerNodeId]);
  const payee = useMemo(() => contexts.find((c) => c.node_id === payeeNodeId) ?? null, [contexts, payeeNodeId]);

  const [amountMsat, setAmountMsat] = useState("100000"); // 100 sats
  const [description, setDescription] = useState("transfer");
  const [expirySecs, setExpirySecs] = useState("3600");
  const [waitTimeoutSecs, setWaitTimeoutSecs] = useState("60");

  const [lastInvoice, setLastInvoice] = useState<string | null>(null);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPayerNodeId(defaultPayerNodeId);
    setPayeeNodeId(contexts.find((c) => c.node_id !== defaultPayerNodeId)?.node_id ?? null);
    setAmountMsat("100000");
    setDescription("transfer");
    setExpirySecs("3600");
    setWaitTimeoutSecs("60");
    setLastInvoice(null);
    setLastPaymentId(null);
  }, [contexts, defaultPayerNodeId, open]);

  const validationError = useMemo(() => {
    if (!payer) return "Missing payer node.";
    if (!payee) return "Pick a payee node.";
    if (payer.node_id === payee.node_id) return "Payer and payee must be different nodes.";
    if (!amountMsat.trim()) return "Amount is required.";
    if (!isDigits(amountMsat)) return "Amount must be u64 msat (decimal).";
    if (amountMsat.trim() === "0") return "Amount must be > 0.";
    if (!description.trim()) return "Description is required.";
    if (!expirySecs.trim() || !isDigits(expirySecs)) return "Expiry must be seconds (u32).";
    if (Number(expirySecs) <= 0) return "Expiry must be > 0.";
    if (!waitTimeoutSecs.trim() || !isDigits(waitTimeoutSecs)) return "Wait timeout must be seconds (u32).";
    if (Number(waitTimeoutSecs) <= 0) return "Wait timeout must be > 0.";
    return null;
  }, [amountMsat, description, expirySecs, payee, payer, waitTimeoutSecs]);

  const transferMutation = useMutation({
    mutationFn: async () => {
      const invoiceResp = await nodeBolt11Receive(payeeNodeId!, {
        amount_msat: u64(amountMsat.trim()),
        description: description.trim(),
        expiry_secs: Number(expirySecs.trim()),
      });
      const sendResp = await nodeBolt11Send(payerNodeId, { invoice: invoiceResp.invoice });
      return { invoice: invoiceResp.invoice, payment_id: sendResp.payment_id };
    },
    onSuccess: (resp) => {
      setLastInvoice(resp.invoice);
      setLastPaymentId(resp.payment_id);
    },
  });

  const waitMutation = useMutation({
    mutationFn: async () => {
      if (!lastPaymentId) throw new Error("missing payment_id");
      const timeoutSecs = Number(waitTimeoutSecs.trim());
      return nodePaymentWait(payerNodeId, lastPaymentId, { timeout_secs: timeoutSecs });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Transfer (BOLT11)</DialogTitle>
          <DialogDescription>Create an invoice on the payee and pay it from the payer.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {!eventsRunning ? (
            <Alert>
              <AlertTitle>Events loop is stopped</AlertTitle>
              <AlertDescription>
                The transfer still works, but confirmations may be slower. Consider starting events from the Nodes sidebar
                or using the “Wait” action below.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Payer (source)</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" type="button" className="justify-between">
                    <span className="truncate">{payer ? payer.display_name : payerNodeId}</span>
                    <span className="ml-2 shrink-0 font-mono text-xs ui-muted">{payerNodeId.slice(0, 12)}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[520px]">
                  <DropdownMenuLabel>Pick payer</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {contexts.map((c) => (
                    <DropdownMenuItem key={c.node_id} onClick={() => setPayerNodeId(c.node_id)}>
                      <div className="min-w-0">
                        <div className="truncate text-sm">{c.display_name}</div>
                        <div className="truncate font-mono text-xs ui-muted">{c.main_api_base_url}</div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid gap-2">
              <Label>Payee (destination)</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" type="button" className="justify-between">
                    <span className="truncate">
                      {payee ? payee.display_name : contexts.length > 1 ? "Pick a node…" : "Need at least 2 nodes"}
                    </span>
                    <span className="ml-2 shrink-0 font-mono text-xs ui-muted">
                      {payeeNodeId ? payeeNodeId.slice(0, 12) : ""}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[520px]">
                  <DropdownMenuLabel>Pick payee</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {contexts
                    .filter((c) => c.node_id !== payerNodeId)
                    .map((c) => (
                      <DropdownMenuItem key={c.node_id} onClick={() => setPayeeNodeId(c.node_id)}>
                        <div className="min-w-0">
                          <div className="truncate text-sm">{c.display_name}</div>
                          <div className="truncate font-mono text-xs ui-muted">{c.main_api_base_url}</div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="transfer_amount_msat">Amount (msat)</Label>
              <Input
                id="transfer_amount_msat"
                className="font-mono"
                value={amountMsat}
                onChange={(e) => setAmountMsat(e.currentTarget.value)}
                inputMode="numeric"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="transfer_expiry">Invoice expiry (secs)</Label>
              <Input
                id="transfer_expiry"
                className="font-mono"
                value={expirySecs}
                onChange={(e) => setExpirySecs(e.currentTarget.value)}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="transfer_desc">Description</Label>
            <Input id="transfer_desc" value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border ui-border ui-muted-10 px-3 py-2">
            <div className="text-xs ui-muted">
              Wait timeout (payer):{" "}
              <span className="font-mono ui-foreground">{waitTimeoutSecs.trim() || "—"}</span> secs
            </div>
            <div className="flex items-center gap-2">
              <Input
                className="h-8 w-28 font-mono text-xs"
                value={waitTimeoutSecs}
                onChange={(e) => setWaitTimeoutSecs(e.currentTarget.value)}
                inputMode="numeric"
              />
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={!lastPaymentId || waitMutation.isPending}
                onClick={() => waitMutation.mutate()}
                title="POST /payment/:id/wait (payer)"
              >
                {waitMutation.isPending ? "Waiting..." : "Wait"}
              </Button>
            </div>
          </div>

          {validationError ? (
            <Alert variant="destructive">
              <AlertTitle>Cannot start transfer</AlertTitle>
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          ) : null}

          {transferMutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Transfer failed</AlertTitle>
              <AlertDescription>{errorToText(transferMutation.error)}</AlertDescription>
            </Alert>
          ) : null}

          {waitMutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Wait failed</AlertTitle>
              <AlertDescription>{errorToText(waitMutation.error)}</AlertDescription>
            </Alert>
          ) : null}

          {lastPaymentId || lastInvoice ? (
            <div className="rounded-md border ui-border ui-muted-10 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold ui-muted">Last transfer</div>
                {waitMutation.data ? (
                  <Badge variant={waitMutation.data.payment.status === "Succeeded" ? "default" : "secondary"}>
                    {waitMutation.data.payment.status}
                  </Badge>
                ) : null}
              </div>
              <Separator className="my-2" />
              {lastPaymentId ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs ui-muted">payment_id (payer)</div>
                    <code className="block max-w-full truncate rounded-md border ui-border ui-surface-40 px-2 py-1 text-xs">
                      {lastPaymentId}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(lastPaymentId);
                    }}
                  >
                    Copy
                  </Button>
                </div>
              ) : null}
              {lastInvoice ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs ui-muted">invoice (payee)</div>
                    <code className="block max-w-full truncate rounded-md border ui-border ui-surface-40 px-2 py-1 text-xs">
                      {lastInvoice}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(lastInvoice);
                    }}
                  >
                    Copy
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={transferMutation.isPending || waitMutation.isPending}
          >
            Close
          </Button>
          <Button
            type="button"
            disabled={transferMutation.isPending || !!validationError}
            onClick={() => transferMutation.mutate()}
          >
            {transferMutation.isPending ? "Transferring..." : "Create invoice + send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
