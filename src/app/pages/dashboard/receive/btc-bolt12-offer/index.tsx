import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { nodeBolt12OfferReceiveVar } from "@/lib/commands";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function BtcBolt12Offer() {
  const nav = useNavigate()
  const currentContext = useContextStore((s) => s.currentContext);
  const [description, setDescription] = useState("");
  const activeNodeId = currentContext?.node_id;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) throw new Error("No active node selected");

      // bolt12 offer with variable amount
      return nodeBolt12OfferReceiveVar(activeNodeId, {
        description: description.trim(),
        expiry_secs: 3600,
      });
    },
    onSuccess: (resp) => {
      nav('/dashboard/receive/btc-bolt12-offer-result?offer='
        + encodeURIComponent(resp.offer)
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
        <div className="text-base text-secondary-foreground bg-background-3 rounded-3xl p-4">
          BOLT-12 is not supported by all wallets and nodes in the lightning network. This feature will work only if you have a channel with a node that supports onion message forwarding, and are paid by a lightning wallet that supports paying BOLT-12 offers.
        </div>
        {/* <Field className="mt-10">
          <FieldLabel>
            Amount
          </FieldLabel>
          <Input
            value={amountValue}
            onChange={(e) => setAmountValue(e.currentTarget.value)}
            inputMode="numeric"
            placeholder="5000000"
            className="h-14 rounded-2xl"
            action={<span className="text-base">msat</span>}
          />
        </Field> */}
        <Field>
          <FieldLabel>Description</FieldLabel>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="or e.g. what this payment for?"
          />
        </Field>
        <div>
          <Button
            type="button"
            size="lg"
            variant="white"
            className="w-full rounded-full"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Create Invoice
          </Button>
        </div>
      </Content>
    </ContentWrapper>
  )
}
