import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { nodeBolt11Receive } from "@/lib/commands";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function BtcBolt11Invoice() {
  const nav = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);
  const [amountSat, setAmountSat] = useState("5000");
  const [description, setDescription] = useState("");
  const activeNodeId = currentContext?.node_id;

   const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) throw new Error("No active node selected");

      // bolt11 invoice
      return nodeBolt11Receive(activeNodeId, {
        amount_msat: (BigInt(amountSat.trim()) * 1000n).toString(),
        description: description.trim(),
        expiry_secs: 3600,
      });
    },
    onSuccess: (resp) => {
      nav('/dashboard/receive/btc-bolt11-invoice-result?invoice='
        + encodeURIComponent(resp.invoice)
        + '&amount=' + encodeURIComponent(amountSat)
        + '&description=' + encodeURIComponent(description)
      )
    },
    onError: (err) => {
      toast.error((err as Error).message)
    }
  });

  return (
    <ContentWrapper>
      <ContentHeader
        title="Create RGB Lightning Invoice"
        onBack={() => nav(-1)}
      />
      <Content className="space-y-8">
        <Field>
          <FieldLabel>
            Amount To Receive
          </FieldLabel>
          <Input
            value={amountSat}
            onChange={(e) => setAmountSat(e.target.value)}
            inputMode="numeric"
            slot={<span className="text-base">sats</span>}
          />
        </Field>
        <Field>
          <FieldLabel>Description</FieldLabel>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Receive BTC"
            className="h-13 rounded-2xl"
          />
        </Field>
        <div>
          <Button
            type="button"
            size="lg"
            variant="white"
            className="w-full rounded-full"
            disabled={amountSat === '' || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Create Invoice
          </Button>
        </div>
      </Content>
    </ContentWrapper>
  )
}
