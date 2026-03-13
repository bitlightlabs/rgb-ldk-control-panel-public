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
  nodeBolt12OfferDecode,
  nodeBolt12OfferReceive,
  nodeBolt12OfferReceiveVar,
  nodeBolt12OfferSend,
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

export function Bolt12OfferDialog({
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

  const [mode, setMode] = useState<"fixed" | "variable">("fixed");
  const [amountMsat, setAmountMsat] = useState("100000");
  const [description, setDescription] = useState("offer");
  const [expirySecs, setExpirySecs] = useState(""); // empty => null
  const [payerNote, setPayerNote] = useState("");
  const [sendAmountMsat, setSendAmountMsat] = useState("");

  const [createdOffer, setCreatedOffer] = useState<string | null>(null);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPayerNodeId(defaultPayerNodeId);
    setPayeeNodeId(contexts.find((c) => c.node_id !== defaultPayerNodeId)?.node_id ?? null);
    setMode("fixed");
    setAmountMsat("100000");
    setDescription("offer");
    setExpirySecs("");
    setPayerNote("");
    setSendAmountMsat("");
    setCreatedOffer(null);
    setLastPaymentId(null);
  }, [contexts, defaultPayerNodeId, open]);

  const expiryValue = useMemo(() => {
    const t = expirySecs.trim();
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.floor(n));
  }, [expirySecs]);

  const offerDecodeQuery = useQuery({
    queryKey: ["bolt12_offer_decode", payerNodeId, createdOffer],
    queryFn: async () => nodeBolt12OfferDecode(payerNodeId, { offer: createdOffer! }),
    enabled: !!createdOffer,
    retry: 0,
  });

  const createAndSendMutation = useMutation({
    mutationFn: async () => {
      const ex = expiryValue;
      const offerResp =
        mode === "variable"
          ? await nodeBolt12OfferReceiveVar(payeeNodeId!, { description: description.trim(), expiry_secs: ex })
          : await nodeBolt12OfferReceive(payeeNodeId!, {
              amount_msat: u64(amountMsat.trim()),
              description: description.trim(),
              expiry_secs: ex,
              quantity: null,
            });

      const sendReq: Parameters<typeof nodeBolt12OfferSend>[1] = {
        offer: offerResp.offer,
        payer_note: payerNote.trim() ? payerNote.trim() : null,
        quantity: null,
      };
      if (mode === "variable") {
        sendReq.amount_msat = u64(sendAmountMsat.trim());
      }
      const sendResp = await nodeBolt12OfferSend(payerNodeId, sendReq);
      return { offer: offerResp.offer, payment_id: sendResp.payment_id };
    },
    onSuccess: (resp) => {
      setCreatedOffer(resp.offer);
      setLastPaymentId(resp.payment_id);
    },
  });

  const waitMutation = useMutation({
    mutationFn: async ({ timeoutSecs }: { timeoutSecs: number }) => {
      if (!lastPaymentId) throw new Error("missing payment_id");
      return nodePaymentWait(payerNodeId, lastPaymentId, { timeout_secs: timeoutSecs });
    },
  });

  const abandonMutation = useMutation({
    mutationFn: async () => {
      if (!lastPaymentId) throw new Error("missing payment_id");
      return nodePaymentAbandon(payerNodeId, lastPaymentId);
    },
  });

  const validationError = useMemo(() => {
    if (!payer) return "Missing payer node.";
    if (!payee) return "Pick a payee node.";
    if (payer.node_id === payee.node_id) return "Payer and payee must be different nodes.";
    if (!description.trim()) return "Description is required.";
    const ex = expirySecs.trim();
    if (ex && !isDigits(ex)) return "Expiry must be seconds (u32).";
    if (mode === "fixed") {
      const a = amountMsat.trim();
      if (!a) return "Amount is required for fixed offers.";
      if (!isDigits(a)) return "Amount must be u64 msat (decimal).";
      if (a === "0") return "Amount must be > 0.";
    } else {
      const a = sendAmountMsat.trim();
      if (!a) return "Send amount is required for variable offers.";
      if (!isDigits(a)) return "Send amount must be u64 msat (decimal).";
      if (a === "0") return "Send amount must be > 0.";
    }
    return null;
  }, [amountMsat, description, expirySecs, mode, payee, payer, sendAmountMsat]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>BOLT12 Offer</DialogTitle>
          <DialogDescription>Create an offer on the payee and pay it from the payer (async).</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
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

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border ui-border p-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold">Offer mode</div>
              <div className="text-xs ui-muted">
                {mode === "fixed" ? "Fixed amount offer." : "Zero amount offer (payer supplies amount)."}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant={mode === "fixed" ? "default" : "outline"} size="sm" type="button" onClick={() => setMode("fixed")}>
                Fixed
              </Button>
              <Button
                variant={mode === "variable" ? "default" : "outline"}
                size="sm"
                type="button"
                onClick={() => setMode("variable")}
              >
                Variable
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {mode === "fixed" ? (
              <div className="grid gap-2">
                <Label htmlFor="offer_amount_msat">Offer amount (msat)</Label>
                <Input
                  id="offer_amount_msat"
                  className="font-mono"
                  value={amountMsat}
                  onChange={(e) => setAmountMsat(e.currentTarget.value)}
                  inputMode="numeric"
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="offer_send_amount_msat">Send amount (msat)</Label>
                <Input
                  id="offer_send_amount_msat"
                  className="font-mono"
                  value={sendAmountMsat}
                  onChange={(e) => setSendAmountMsat(e.currentTarget.value)}
                  placeholder="Required for variable offers"
                  inputMode="numeric"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="offer_expiry_secs">Offer expiry (secs, optional)</Label>
              <Input
                id="offer_expiry_secs"
                className="font-mono"
                value={expirySecs}
                onChange={(e) => setExpirySecs(e.currentTarget.value)}
                placeholder="e.g. 3600"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="offer_desc">Description</Label>
            <Input id="offer_desc" value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="offer_payer_note">Payer note (optional)</Label>
            <Input id="offer_payer_note" value={payerNote} onChange={(e) => setPayerNote(e.currentTarget.value)} />
          </div>

          {validationError ? (
            <Alert variant="destructive">
              <AlertTitle>Cannot start offer payment</AlertTitle>
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          ) : null}

          {createAndSendMutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Offer flow failed</AlertTitle>
              <AlertDescription>{errorToText(createAndSendMutation.error)}</AlertDescription>
            </Alert>
          ) : null}

          {createdOffer ? (
            <div className="rounded-md border ui-border ui-muted-10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold ui-muted">Offer</div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(createdOffer);
                  }}
                >
                  Copy
                </Button>
              </div>
              <Separator className="my-2" />
              <Textarea className="font-mono text-xs" value={createdOffer} readOnly rows={4} />
              {offerDecodeQuery.isSuccess ? (
                <div className="mt-2 text-xs ui-muted">
                  decoded amount_msat={offerDecodeQuery.data.amount_msat ? offerDecodeQuery.data.amount_msat.toString() : "variable"} • paths={offerDecodeQuery.data.paths_count}
                </div>
              ) : null}
            </div>
          ) : null}

          {lastPaymentId ? (
            <div className="rounded-md border ui-border ui-muted-10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold ui-muted">Payment</div>
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
                <code className="max-w-full truncate rounded-md border ui-border ui-surface-40 px-2 py-1 text-xs">{lastPaymentId}</code>
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
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={createAndSendMutation.isPending}>
            Close
          </Button>
          <Button type="button" disabled={createAndSendMutation.isPending || !!validationError} onClick={() => createAndSendMutation.mutate()}>
            {createAndSendMutation.isPending ? "Sending..." : "Create offer + send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
