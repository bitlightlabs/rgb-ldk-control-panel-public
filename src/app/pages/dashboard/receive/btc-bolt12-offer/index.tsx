import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useBolt12OfferReceiveVarMutation } from "@/app/mutations";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function BtcBolt12Offer() {
  const nav = useNavigate()
  const currentContext = useContextStore((s) => s.currentContext);
  const [description, setDescription] = useState("");
  const activeNodeId = currentContext?.node_id;

  const createMutation = useBolt12OfferReceiveVarMutation({
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
        title="Create Lightning Offer"
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
            slot={<span className="text-base">msat</span>}
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
            onClick={() => {
              if (!activeNodeId) {
                toast.error("No active node selected");
                return;
              }
              createMutation.mutate({
                nodeId: activeNodeId,
                request: {
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
