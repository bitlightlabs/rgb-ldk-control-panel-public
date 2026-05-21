import AssetSelect from "@/app/components/AssetSelect";
import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { nodeRgbLnInvoiceCreate } from "@/lib/commands";
import type { RgbContractDto } from "@/lib/sdk/types";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function RGBInvoice() {
  const nav = useNavigate()
  const currentContext = useContextStore((s) => s.currentContext);
  const [selectedContract, setSelectedContract] = useState<RgbContractDto | null>(null);
  const [amount, setAmount] = useState("21");
  const [btcCarrierSat, setBtcCarrierSat] = useState("5000");
  const [description, setDescription] = useState("");
  const activeNodeId = currentContext?.node_id;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) throw new Error("No active node selected");
      if (!selectedContract) throw new Error("No RGB contract selected");

      // rgb invoice
      const precision = selectedContract?.precision ?? 0;
      return nodeRgbLnInvoiceCreate(activeNodeId, {
        contract_id: selectedContract?.contract_id.trim(),
        asset_amount: BigInt(Number(amount.trim()) * 10 ** precision).toString(),
        description: description.trim(),
        expiry_secs: 3600,
        btc_carrier_amount_msat: (BigInt(btcCarrierSat.trim()) * 1000n).toString(),
      });
    },
    onSuccess: (resp) => {
      nav('/dashboard/receive/rgb-invoice-result?invoice='
        + encodeURIComponent(resp.invoice)
        + '&name=' + encodeURIComponent(selectedContract?.name ?? "")
        + '&amount=' + encodeURIComponent(amount)
        + '&btc_carrier=' + encodeURIComponent(btcCarrierSat)
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
            Asset
          </FieldLabel>
          <AssetSelect
            selectedContractId={selectedContract?.contract_id ?? ""}
            onChange={setSelectedContract}
          />
        </Field>
        <Field>
          <FieldLabel>Amount to Receive</FieldLabel>
          <Input
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            inputMode="numeric"
            placeholder="21"
            action={
              <>
                <span className="text-base">{selectedContract?.name}</span>
              </>
            }
          />
        </Field>
        <Field>
          <FieldLabel>
            BTC Carrier
          </FieldLabel>
          <Input
            value={btcCarrierSat}
            onChange={(e) =>
              setBtcCarrierSat(e.target.value)
            }
            inputMode="numeric"
            placeholder="5000"
            action={
              <>
                <span className="text-base">sat</span>
              </>
            }
          />
        </Field>
        <Field>
          <FieldLabel>Description</FieldLabel>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Receive RGB Asset"
          />
        </Field>
        <div>
           <Button
              type="button"
              size="lg"
              variant="white"
              className="w-full rounded-full"
              disabled={selectedContract === null || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Create Invoice
            </Button>
        </div>
      </Content>
    </ContentWrapper>

  )
}
