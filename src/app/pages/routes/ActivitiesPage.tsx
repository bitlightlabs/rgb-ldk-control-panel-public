import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNodeStore } from "@/app/stores/nodeStore";
import { eventsList, nodePaymentsList } from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import type { StoredEvent } from "@/lib/domain";

type ActivityItem = {
  id: string;
  timestampMs: number | null;
  type: "Send" | "Receive";
  txid: string;
  amountBtc: string;
  status: string;
};

function shortTxid(txid: string) {
  return `${txid.slice(0, 4)}...${txid.slice(-4)}`;
}

function msatToBtc(msat: unknown): number | null {
  const n = Number(msat);
  if (!Number.isFinite(n)) return null;
  return n / 1000 / 100_000_000;
}

function formatBtcAmount(msat: unknown, direction: "Inbound" | "Outbound"): string {
  const btc = msatToBtc(msat);
  if (btc === null) return "-";
  const sign = direction === "Outbound" ? "-" : "+";
  return `${sign}${btc.toFixed(8)} BTC`;
}

function formatDate(timestampMs: number | null): string {
  if (!timestampMs) return "-";
  return new Date(timestampMs).toLocaleString();
}

function extractTxidFromKindDetails(kindDetails: unknown): string | null {
  const seen = new Set<unknown>();
  function walk(v: unknown, depth: number): string | null {
    if (depth > 4 || v == null) return null;
    if (typeof v === "string") {
      if (/^[0-9a-fA-F]{64}$/.test(v)) return v;
      if (v.includes(":")) {
        const [txid] = v.split(":");
        if (/^[0-9a-fA-F]{64}$/.test(txid ?? "")) return txid!;
      }
      return null;
    }
    if (typeof v !== "object") return null;
    if (seen.has(v)) return null;
    seen.add(v);
    const obj = v as Record<string, unknown>;
    for (const key of ["txid", "tx_id", "transaction_id", "utxo"]) {
      const found = walk(obj[key], depth + 1);
      if (found) return found;
    }
    for (const value of Object.values(obj)) {
      const found = walk(value, depth + 1);
      if (found) return found;
    }
    return null;
  }
  return walk(kindDetails, 0);
}

export function ActivitiesPage() {
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const paymentsQuery = useQuery({
    queryKey: ["node_payments_list", activeNodeId],
    queryFn: () => nodePaymentsList(activeNodeId!),
    enabled: !!activeNodeId,
    refetchInterval: 5_000,
  });
  const eventsQuery = useQuery({
    queryKey: ["events_list", activeNodeId, "activities"],
    queryFn: () => eventsList(activeNodeId!, 300),
    enabled: !!activeNodeId,
    refetchInterval: 5_000,
  });

  const latestEventTimestampByPaymentId = useMemo(() => {
    const map = new Map<string, number>();
    const events = (eventsQuery.data ?? []) as StoredEvent[];
    for (const ev of events) {
      if (ev.event.type === "PaymentReceived") {
        const id = ev.event.data.payment_id;
        if (id) map.set(id, Math.max(map.get(id) ?? 0, ev.received_at_ms));
      }
      if (ev.event.type === "PaymentSuccessful") {
        const id = ev.event.data.payment_id;
        if (id) map.set(id, Math.max(map.get(id) ?? 0, ev.received_at_ms));
      }
      if (ev.event.type === "PaymentFailed") {
        const id = ev.event.data.payment_id;
        if (id) map.set(id, Math.max(map.get(id) ?? 0, ev.received_at_ms));
      }
    }
    return map;
  }, [eventsQuery.data]);

  const activities = useMemo(() => {
    const list = paymentsQuery.data ?? [];
    const onchain = list.filter((p) => p.kind === "Onchain");
    const mapped: ActivityItem[] = onchain.map((p) => {
      const txid = extractTxidFromKindDetails(p.kind_details) ?? p.id;
      const type = p.direction === "Outbound" ? "Send" : "Receive";
      return {
        id: p.id,
        timestampMs: latestEventTimestampByPaymentId.get(p.id) ?? null,
        type,
        txid,
        amountBtc: formatBtcAmount(p.amount_msat, p.direction),
        status: p.status,
      };
    });
    mapped.sort((a, b) => (b.timestampMs ?? 0) - (a.timestampMs ?? 0));
    return mapped;
  }, [latestEventTimestampByPaymentId, paymentsQuery.data]);

  if (!activeNodeId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm ui-muted">No active node selected.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activities</CardTitle>
      </CardHeader>
      <CardContent>
        {paymentsQuery.isLoading ? (
          <div className="text-sm ui-muted">Loading...</div>
        ) : paymentsQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Request failed</AlertTitle>
            <AlertDescription>{errorToText(paymentsQuery.error)}</AlertDescription>
          </Alert>
        ) : activities.length === 0 ? (
          <div className="text-sm ui-muted">No BTC on-chain activities.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Txid</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((item) => {
                const href = `https://bitcoin-regtest-explorer.bitlightdev.info/tx/${item.txid}`;
                const isSend = item.type === "Send";
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            isSend
                              ? "inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-white"
                              : "inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white"
                          }
                        >
                          {isSend ? (
                            <ArrowUp className="h-5 w-5" />
                          ) : (
                            <ArrowDown className="h-5 w-5" />
                          )}
                        </span>
                        <span
                          className={
                            isSend
                              ? "font-semibold"
                              : "font-semibold text-emerald-500"
                          }
                        >
                          {item.type}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm ui-muted hover:underline"
                      >
                        tx: {shortTxid(item.txid)}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.amountBtc}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          item.status === "Succeeded"
                            ? "font-semibold text-emerald-500"
                            : item.status === "Failed"
                              ? "font-semibold text-red-500"
                              : "font-semibold text-amber-500"
                        }
                      >
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatDate(item.timestampMs)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
