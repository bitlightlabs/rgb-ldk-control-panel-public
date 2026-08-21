import AssetSelect from "@/app/components/AssetSelect";
import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import IconHelp from "@/app/icons/help";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRgbLnInvoiceCreateMutation } from "@/app/mutations";
import type { RgbContractDto } from "@/lib/sdk/types";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useRgbInvoiceEstimateCarrierQuery } from "@/app/queries/rgb";
import { errorToText } from "@/lib/errorToText";
import { BTC_CARRIER_TIP } from "@/app/config/constant";

export function RGBInvoice() {
  const nav = useNavigate()
  const currentContext = useContextStore((s) => s.currentContext);
  const [selectedContract, setSelectedContract] = useState<RgbContractDto | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [userCarrierSat, setUserCarrierSat] = useState<string>("");
  const activeNodeId = currentContext?.node_id;

  const createMutation = useRgbLnInvoiceCreateMutation()

  const carrierEstimateQuery = useRgbInvoiceEstimateCarrierQuery(activeNodeId, {
    enabled: false
  })

  const loadInitCarrier = async () => {
    try {
      const json = await carrierEstimateQuery.refetch()
      const estimateCarrierAmountMsat = json.data?.minimum_viable_carrier_amount_msat ?? '0'

      // If the recipient does not have a reserve fund,
      // Triple (Punishment reserve + Channel reserve ≈ 3x) the estimate value to enable bidirectional payment
      // If the value is less than 10 sats (Already have a reserve fund), we will not triple it
      // but instead use the minimum value of 1 to receive the asset
      let estimateCarrierAmountSat = '1'
      if (BigInt(estimateCarrierAmountMsat) / 1000n >= 10n) {
        estimateCarrierAmountSat = (BigInt(estimateCarrierAmountMsat) / 1000n * 3n).toString()
      }
      setUserCarrierSat(estimateCarrierAmountSat)
    } catch(e) {}
  }

  useEffect(() => {
    loadInitCarrier()
  }, [])

  const createInvoice = async () => {
    try {
      if (!activeNodeId) {
        toast.error("No active node");
        return;
      }
      if (!selectedContract) {
        toast.error("Invalid RGB contract");
        return;
      }

      // Create the invoice
      const precision = selectedContract.precision ?? 0;
      const result = await createMutation.mutateAsync({
        nodeId: activeNodeId,
        request: {
          contract_id: selectedContract.contract_id,
          asset_amount: BigInt(Number(amount.trim()) * 10 ** precision).toString(),
          description: description.trim(),
          expiry_secs: 3600,
          btc_carrier_amount_msat: (BigInt(userCarrierSat) * 1000n).toString()
        },
      })

      // Jump
      nav('/dashboard/receive/rgb-invoice-result?invoice='
        + encodeURIComponent(result.invoice)
        + '&name=' + encodeURIComponent(selectedContract?.name ?? "")
        + '&amount=' + encodeURIComponent(amount)
        + '&btc_carrier=' + (BigInt(result.btc_carrier_amount_msat) / 1000n).toString()
      )
    } catch(err) {
      toast.error(errorToText(err))
    }
  }

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
            placeholder="0"
            className="bg-background-4"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            inputMode="numeric"
            slot={<span className="text-base">{selectedContract?.name}</span>}
          />
          <div className="h-13 text-base bg-background-4 rounded-3xl px-4 flex items-center justify-between">
            <div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 text-secondary-foreground">
                    <span>BTC Carrier</span>
                    <IconHelp />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="w-[254px]">
                  <p>{BTC_CARRIER_TIP}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="font-medium">
              {userCarrierSat} sats
            </div>
          </div>
        </Field>
        <Field>
          <FieldLabel>Description</FieldLabel>
          <Input
            className="bg-background-4"
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
            onClick={createInvoice}
          >
            Create Invoice
          </Button>
        </div>
      </Content>
    </ContentWrapper>
  )
}
