import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useBolt11ReceiveMutation } from "@/app/mutations";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function BtcBolt11Invoice() {
  const nav = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);
  const [amountSat, setAmountSat] = useState("");
  const [description, setDescription] = useState("");
  const activeNodeId = currentContext?.node_id;

   const createMutation = useBolt11ReceiveMutation({
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
            placeholder="0"
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
            onClick={() => {
              if (!activeNodeId) {
                toast.error("No active node selected");
                return;
              }
              createMutation.mutate({
                nodeId: activeNodeId,
                request: {
                  amount_msat: (BigInt(amountSat.trim()) * 1000n).toString(),
                  description: description.trim(),
                  expiry_secs: 3600,
                },
              });
            }}
          >
            Create Invoice
          </Button>
        </div>
      </Content>
    </ContentWrapper>
  )
}
