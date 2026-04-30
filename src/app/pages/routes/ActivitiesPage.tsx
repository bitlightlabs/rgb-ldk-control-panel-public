import { useQuery } from "@tanstack/react-query";
import { useNodeStore } from "@/app/stores/nodeStore";
import { nodePaymentsList } from "@/lib/commands";
import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { useNavigate } from "react-router-dom";
import Btc from "@/app/components/activities/Btc";
import { Button } from "@/components/ui/button";
import IconReceive from "@/app/icons/receive";
import Empty from "@/app/components/Empty";

// type ActivityItem = {
//   id: string;
//   timestampMs: number | null;
//   type: "Send" | "Receive";
//   txid: string;
//   amountBtc: string;
//   status: string;
// };

// function shortTxid(txid: string) {
//   return `${txid.slice(0, 4)}...${txid.slice(-4)}`;
// }

// function msatToBtc(msat: unknown): number | null {
//   const n = Number(msat);
//   if (!Number.isFinite(n)) return null;
//   return n / 1000 / 100_000_000;
// }

// function formatBtcAmount(msat: unknown, direction: "Inbound" | "Outbound"): string {
//   const btc = msatToBtc(msat);
//   if (btc === null) return "-";
//   const sign = direction === "Outbound" ? "-" : "+";
//   return `${sign}${btc.toFixed(8)} BTC`;
// }

// function formatDate(timestampMs: number | null): string {
//   if (!timestampMs) return "-";
//   return new Date(timestampMs).toLocaleString();
// }

// function extractTxidFromKindDetails(kindDetails: unknown): string | null {
//   const seen = new Set<unknown>();
//   function walk(v: unknown, depth: number): string | null {
//     if (depth > 4 || v == null) return null;
//     if (typeof v === "string") {
//       if (/^[0-9a-fA-F]{64}$/.test(v)) return v;
//       if (v.includes(":")) {
//         const [txid] = v.split(":");
//         if (/^[0-9a-fA-F]{64}$/.test(txid ?? "")) return txid!;
//       }
//       return null;
//     }
//     if (typeof v !== "object") return null;
//     if (seen.has(v)) return null;
//     seen.add(v);
//     const obj = v as Record<string, unknown>;
//     for (const key of ["txid", "tx_id", "transaction_id", "utxo"]) {
//       const found = walk(obj[key], depth + 1);
//       if (found) return found;
//     }
//     for (const value of Object.values(obj)) {
//       const found = walk(value, depth + 1);
//       if (found) return found;
//     }
//     return null;
//   }
//   return walk(kindDetails, 0);
// }

export function ActivitiesPage() {
  const nav = useNavigate()
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const paymentsQuery = useQuery({
    queryKey: ["node_payments_list", activeNodeId],
    queryFn: () => nodePaymentsList(activeNodeId!),
    enabled: !!activeNodeId,
    refetchInterval: 5_000,
  });

  if (!activeNodeId || paymentsQuery.isPending) {
    return null
  }

  const list = paymentsQuery.data ?? [];

  return (
    <ContentWrapper className="w-full">
      <ContentHeader title="Activities" onBack={() => nav('/dashboard')} />
      <Content className="px-2">
        {
          list.length === 0 ? (
            <div className="flex h-[532px] items-center justify-center">
              <Empty
                title={"No transaction yet"}
                subTitle={"You must recent incoming and outgoing payments will show up here."}
                action={
                  <Button
                    size="lg"
                    variant="destructive"
                    className="rounded-full"
                    onClick={() => nav('/dashboard/receive')}
                  >
                    <IconReceive />
                    <span>Receive Your First Payment</span>
                  </Button>
                }
              />
            </div>
          ) : list.map((item) => {
            return (
              <Btc data={item} />
            )
          })
        }
      </Content>
    </ContentWrapper>
  );
}
