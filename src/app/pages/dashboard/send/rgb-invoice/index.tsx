import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import CopyText from "@/app/components/CopyText";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { nodeRgbContracts, nodeRgbLnInvoiceDecode, nodeRgbLnPay } from "@/lib/commands";
import { formatNumber } from "@/lib/number";
import { formatAddress } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";


export default function SendLnRGBInvoiceConfirm() {
  const nav = useNavigate()
  const currentContext = useContextStore((s) => s.currentContext);
  const [search] = useSearchParams()

  const payload = search.get('payload') ?? "";
  const activeNodeId = currentContext?.node_id;

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) throw new Error("No active node selected");

      // ln rgb
      return nodeRgbLnPay(activeNodeId, { invoice: payload });
    },
    onSuccess: (resp) => {
      nav('/dashboard/send/success?payment_id='
        + encodeURIComponent(resp.payment_id)
        + '&amount=' + encodeURIComponent(amount)
        + '&symbol=' + encodeURIComponent(currentContract?.name ?? "")
      )
    },
    onError: (err) => {
      toast.error((err as Error).message)
    }
  });

   const rgbContractsQuery = useQuery({
    queryKey: ["send_onchain_rgb_contracts", activeNodeId],
    queryFn: async () => nodeRgbContracts(activeNodeId!),
    enabled: !!activeNodeId
  });

  const rgbInvoiceDecodeQuery = useQuery({
    queryKey: ["rgb_ln_invoice_decode", activeNodeId, payload],
    queryFn: async () => {
      return nodeRgbLnInvoiceDecode(activeNodeId!, {invoice: payload})
    },
    enabled: !!activeNodeId && payload.trim() !== "",
    retry: 1,
    retryDelay: 200,
  });

  // current contract
  const currentContract = useMemo(() => {
    if(!rgbInvoiceDecodeQuery.data || !rgbContractsQuery.data) return null;
    const obj = rgbContractsQuery.data.contracts.find(c => c.contract_id === rgbInvoiceDecodeQuery.data.contract_id);
    return obj ?? null;
  }, [rgbInvoiceDecodeQuery.data, rgbContractsQuery.data])

  const precision = currentContract?.precision ?? 0;
  const amount = formatNumber(rgbInvoiceDecodeQuery.data?.asset_amount ?? 0, precision)

  return (
    <ContentWrapper>
      <ContentHeader
        title="RGB Payment"
        onBack={() => nav(-1)}
      />
      <Content>
        <div className="text-xl text-center">You Are Sending</div>
        <div className="mt-9 h-10 leading-10 text-center">
          <span className="text-[34px] font-bold">
            {amount}
          </span>
          <span className="pl-2 text-[22px]">{currentContract?.name}</span>
        </div>
        <div className="mt-10 bg-background-3 rounded-3xl p-4">
          <div className="h-5 flex justify-between">
            <label className="text-base text-secondary-foreground">To</label>
            <div className="text-base flex gap-1 items-center">
              <span>{formatAddress(rgbInvoiceDecodeQuery.data?.destination)}</span>
              <CopyText
                text={rgbInvoiceDecodeQuery.data?.destination ?? ""}
                className="text-secondary-foreground"
              />
            </div>
          </div>
          <div className="bg-background-3 h-[1px] my-4"></div>
          <div className="flex justify-between">
            <label className="text-base text-secondary-foreground">BTC Carrier</label>
            <div className="text-base text-right">
              <div className="text-base">{BigInt(rgbInvoiceDecodeQuery.data?.carrier_amount_msat ?? 0) / BigInt(1000)} sats</div>
              {/* <div className="text-sm text-secondary-foreground font-normal">vailable: - BTC</div> */}
            </div>
          </div>
          <div className="mt-4 h-5 flex justify-between">
            <label className="text-base text-secondary-foreground">Contract ID</label>
            <div className="text-base flex gap-1 items-center">
              <span>{formatAddress(rgbInvoiceDecodeQuery.data?.contract_id)}</span>
              <CopyText
                text={rgbInvoiceDecodeQuery.data?.contract_id ?? ""}
                className="text-secondary-foreground"
              />
            </div>
          </div>
        </div>

        <div className="mt-10 flex gap-3">
          <Button
            size="lg"
            variant="destructive"
            className="bg-background-3 w-[120px] shrink-0 rounded-full"
            onClick={() => nav(-1)}
          >Back</Button>
          <Button
            size="lg"
            variant="white"
            className="flex-1 rounded-full"
            disabled={rgbContractsQuery.isPending
              || rgbInvoiceDecodeQuery.isPending
              || sendMutation.isPending
            }
            onClick={() => sendMutation.mutate()}
          >Confirm Payment</Button>
        </div>
      </Content>
    </ContentWrapper>
  )
}
