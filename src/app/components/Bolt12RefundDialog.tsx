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
import { Textarea } from "@/components/ui/textarea";
import type { NodeContext } from "@/lib/domain";
import {
  nodeBolt12RefundDecode,
  nodeBolt12RefundInitiate,
  nodeBolt12RefundRequestPayment,
  nodePaymentAbandon,
  nodePaymentWait,
} from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { u64 } from "@/lib/sdk";

function isDigits(s: string): boolean {
  return /^[0-9]+$/.test(s.trim());
}

export function Bolt12RefundDialog({
  open,
  onOpenChange,
  contexts,
  defaultPayerNodeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contexts: NodeContext[];
  defaultPayerNodeId: string;
}) {
  const [payerNodeId, setPayerNodeId] = useState<string>(defaultPayerNodeId);
  const [payeeNodeId, setPayeeNodeId] = useState<string | null>(null);

  const payer = useMemo(() => contexts.find((c) => c.node_id === payerNodeId) ?? null, [contexts, payerNodeId]);
  const payee = useMemo(() => contexts.find((c) => c.node_id === payeeNodeId) ?? null, [contexts, payeeNodeId]);

  const [amountMsat, setAmountMsat] = useState("100000");
  const [expirySecs, setExpirySecs] = useState("3600");
  const [payerNote, setPayerNote] = useState("");

  const [refund, setRefund] = useState<string | null>(null);
  const [payerPaymentId, setPayerPaymentId] = useState<string | null>(null);
  const [payeeInvoice, setPayeeInvoice] = useState<string | null>(null);
  const [payeePaymentId, setPayeePaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPayerNodeId(defaultPayerNodeId);
    setPayeeNodeId(contexts.find((c) => c.node_id !== defaultPayerNodeId)?.node_id ?? null);
    setAmountMsat("100000");
    setExpirySecs("3600");
    setPayerNote("");
    setRefund(null);
    setPayerPaymentId(null);
    setPayeeInvoice(null);
    setPayeePaymentId(null);
  }, [contexts, defaultPayerNodeId, open]);

  const refundDecodeQuery = useQuery({
    queryKey: ["bolt12_refund_decode", payerNodeId, refund],
    queryFn: async () => nodeBolt12RefundDecode(payerNodeId, { refund: refund! }),
    enabled: !!refund,
    retry: 0,
  });

  const initiateMutation = useMutation({
    mutationFn: async () => {
      return nodeBolt12RefundInitiate(payerNodeId, {
        amount_msat: u64(amountMsat.trim()),
        expiry_secs: Number(expirySecs.trim()),
        quantity: null,
        payer_note: payerNote.trim() ? payerNote.trim() : null,
      });
    },
    onSuccess: (resp) => {
      setRefund(resp.refund);
      setPayerPaymentId(resp.payment_id);
      setPayeeInvoice(null);
      setPayeePaymentId(null);
    },
  });

  const requestPaymentMutation = useMutation({
    mutationFn: async () => {
      return nodeBolt12RefundRequestPayment(payeeNodeId!, { refund: refund! });
    },
    onSuccess: (resp) => {
      setPayeeInvoice(resp.invoice);
      setPayeePaymentId(resp.payment_id);
    },
  });

  const waitMutation = useMutation({
    mutationFn: async ({ timeoutSecs }: { timeoutSecs: number }) => {
      if (!payerPaymentId) throw new Error("missing payer payment_id");
      return nodePaymentWait(payerNodeId, payerPaymentId, { timeout_secs: timeoutSecs });
    },
  });

  const abandonMutation = useMutation({
    mutationFn: async () => {
      if (!payerPaymentId) throw new Error("missing payer payment_id");
      return nodePaymentAbandon(payerNodeId, payerPaymentId);
    },
  });

  const validationError = useMemo(() => {
    if (!payer) return "Missing payer node.";
    if (!payee) return "Pick a payee node.";
    if (payer.node_id === payee.node_id) return "Payer and payee must be different nodes.";
    const a = amountMsat.trim();
    if (!a) return "Amount is required.";
    if (!isDigits(a)) return "Amount must be u64 msat (decimal).";
    if (a === "0") return "Amount must be > 0.";
    const ex = expirySecs.trim();
    if (!ex) return "Expiry is required.";
    if (!isDigits(ex)) return "Expiry must be seconds (u32).";
    if (Number(ex) <= 0) return "Expiry must be > 0.";
    return null;
  }, [amountMsat, expirySecs, payee, payer]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>BOLT12 Refund</DialogTitle>
          <DialogDescription>
            Payer initiates a refund and shares it with the payee. Payee requests payment, payer waits for completion.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Payer (initiates)</Label>
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
              <Label>Payee (requests payment)</Label>
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
              <Label htmlFor="refund_amount_msat">Amount (msat)</Label>
              <Input
                id="refund_amount_msat"
                className="font-mono"
                value={amountMsat}
                onChange={(e) => setAmountMsat(e.currentTarget.value)}
                inputMode="numeric"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="refund_expiry_secs">Expiry (secs)</Label>
              <Input
                id="refund_expiry_secs"
                className="font-mono"
                value={expirySecs}
                onChange={(e) => setExpirySecs(e.currentTarget.value)}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="refund_payer_note">Payer note (optional)</Label>
            <Input id="refund_payer_note" value={payerNote} onChange={(e) => setPayerNote(e.currentTarget.value)} />
          </div>

          {validationError ? (
            <Alert variant="destructive">
              <AlertTitle>Cannot initiate refund</AlertTitle>
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          ) : null}

          {initiateMutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Initiate failed</AlertTitle>
              <AlertDescription>{errorToText(initiateMutation.error)}</AlertDescription>
            </Alert>
          ) : null}

          {refund ? (
            <div className="rounded-md border ui-border ui-muted-10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold ui-muted">Refund string</div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(refund);
                  }}
                >
                  Copy
                </Button>
              </div>
              <Separator className="my-2" />
              <Textarea className="font-mono text-xs" value={refund} readOnly rows={4} />
              {refundDecodeQuery.isSuccess ? (
                <div className="mt-2 text-xs ui-muted">
                  decoded amount_msat={refundDecodeQuery.data.amount_msat.toString()} • paths={refundDecodeQuery.data.paths_count}
                </div>
              ) : null}
            </div>
          ) : null}

          {payerPaymentId ? (
            <div className="rounded-md border ui-border ui-muted-10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold ui-muted">Payer payment_id</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={waitMutation.isPending}
                    onClick={() => waitMutation.mutate({ timeoutSecs: 60 })}
                  >
                    {waitMutation.isPending ? "Waiting..." : "Wait 60s"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    type="button"
                    disabled={abandonMutation.isPending}
                    onClick={() => abandonMutation.mutate()}
                  >
                    Abandon
                  </Button>
                </div>
              </div>
              <Separator className="my-2" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <code className="max-w-full truncate rounded-md border ui-border ui-surface-40 px-2 py-1 text-xs">{payerPaymentId}</code>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(payerPaymentId);
                  }}
                >
                  Copy
                </Button>
              </div>
              {waitMutation.data ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs ui-muted">
                  <Badge variant={waitMutation.data.payment.status === "Succeeded" ? "default" : "secondary"}>
                    {waitMutation.data.payment.status}
                  </Badge>
                  <span>
                    amount_msat={waitMutation.data.payment.amount_msat?.toString() ?? "—"} fee_msat=
                    {waitMutation.data.payment.fee_paid_msat?.toString() ?? "—"}
                  </span>
                </div>
              ) : null}
              {waitMutation.isError ? (
                <Alert className="mt-2" variant="destructive">
                  <AlertTitle>Wait failed</AlertTitle>
                  <AlertDescription>{errorToText(waitMutation.error)}</AlertDescription>
                </Alert>
              ) : null}
              {abandonMutation.isError ? (
                <Alert className="mt-2" variant="destructive">
                  <AlertTitle>Abandon failed</AlertTitle>
                  <AlertDescription>{errorToText(abandonMutation.error)}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border ui-border p-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold">Payee step</div>
              <div className="text-xs ui-muted">Payee requests the refund payment (sends invoice to payer).</div>
            </div>
            <Button
              type="button"
              disabled={!refund || requestPaymentMutation.isPending || !!validationError}
              onClick={() => requestPaymentMutation.mutate()}
            >
              {requestPaymentMutation.isPending ? "Requesting..." : "Request payment"}
            </Button>
          </div>

          {requestPaymentMutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Request payment failed</AlertTitle>
              <AlertDescription>{errorToText(requestPaymentMutation.error)}</AlertDescription>
            </Alert>
          ) : null}

          {payeeInvoice ? (
            <div className="rounded-md border ui-border ui-muted-10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold ui-muted">Invoice (payee)</div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(payeeInvoice);
                  }}
                >
                  Copy
                </Button>
              </div>
              <Separator className="my-2" />
              <Textarea className="font-mono text-xs" value={payeeInvoice} readOnly rows={4} />
              {payeePaymentId ? (
                <div className="mt-2 text-xs ui-muted">
                  payee payment_id <span className="font-mono">{payeePaymentId}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={initiateMutation.isPending}>
            Close
          </Button>
          <Button type="button" disabled={initiateMutation.isPending || !!validationError} onClick={() => initiateMutation.mutate()}>
            {initiateMutation.isPending ? "Initiating..." : "Initiate refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
