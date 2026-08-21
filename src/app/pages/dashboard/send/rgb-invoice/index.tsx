import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { errorToText } from "@/lib/errorToText";
import { CopyTextInline } from "@/app/components/CopyText";
import IconHelp from "@/app/icons/help";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRgbLnPayMutation } from "@/app/mutations";
import { useNodeRgbContractsQuery, useRgbLnInvoiceDecodeQuery } from "@/app/queries";
import { formatNumber } from "@/lib/number";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { BTC_CARRIER_TIP } from "@/app/config/constant";


export default function SendLnRGBInvoiceConfirm() {
  const nav = useNavigate()
  const currentContext = useContextStore((s) => s.currentContext);
  const [search] = useSearchParams()

  const payload = search.get('payload') ?? "";
  const activeNodeId = currentContext?.node_id;

  const sendMutation = useRgbLnPayMutation({
    onSuccess: (resp) => {
      nav('/dashboard/send/success?payment_id='
        + encodeURIComponent(resp.payment_id)
        + '&amount=' + encodeURIComponent(amount)
        + '&symbol=' + encodeURIComponent(currentContract?.name ?? "")
      )
    },
    onError: (err) => {
      toast.error(errorToText(err))
    }
  });

  const rgbContractsQuery = useNodeRgbContractsQuery(activeNodeId);

  const rgbInvoiceDecodeQuery = useRgbLnInvoiceDecodeQuery(activeNodeId, payload);

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
        <div className="text-lg text-center">You Are Sending</div>
        <div className="mt-9 h-10 leading-10 text-center">
          <span className="text-[34px] font-bold">
            {amount}
          </span>
          <span className="pl-2 text-[22px]">{currentContract?.name}</span>
        </div>
        <div className="mt-10 bg-background-3 rounded-3xl p-4">
          <div className="h-5 flex justify-between">
            <label className="text-base text-secondary-foreground">To</label>
            <CopyTextInline
              text={rgbInvoiceDecodeQuery.data?.destination ?? ''}
              buttonClassName="text-secondary-foreground"
            />
          </div>
          <div className="bg-background-3 h-[1px] my-4"></div>
          <div className="flex justify-between">
            <label className="text-base text-secondary-foreground flex gap-2">
              <span>BTC Carrier</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 hover:text-foreground">
                    <IconHelp />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="w-[254px]">
                  <p>{BTC_CARRIER_TIP}</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <div className="text-base text-right">
              <div className="text-base">{BigInt(rgbInvoiceDecodeQuery.data?.carrier_amount_msat ?? 0) / BigInt(1000)} sats</div>
              {/* <div className="text-sm text-secondary-foreground font-normal">vailable: - BTC</div> */}
            </div>
          </div>
          <div className="mt-4 h-5 flex justify-between">
            <label className="text-base text-secondary-foreground">Contract ID</label>
            <CopyTextInline
              text={rgbInvoiceDecodeQuery.data?.contract_id ?? ''}
              buttonClassName="text-secondary-foreground"
            />
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
              || (rgbInvoiceDecodeQuery.data === undefined)
              || sendMutation.isPending
              || !currentContract
            }
            onClick={() => {
              if (!activeNodeId) return;
              sendMutation.mutate({
                nodeId: activeNodeId,
                request: { invoice: payload },
              });
            }}
          >Confirm Payment</Button>
        </div>
      </Content>
    </ContentWrapper>
  )
}
