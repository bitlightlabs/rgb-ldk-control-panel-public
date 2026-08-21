import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { CopyTextInline } from "@/app/components/CopyText";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { useBolt11SendMutation } from "@/app/mutations";
import { useBolt11DecodeQuery, useNodeRgbContractsQuery } from "@/app/queries";
import { formatNumber } from "@/lib/number";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";


export default function SendLnInvoiceConfirm() {
  const nav = useNavigate()
  const currentContext = useContextStore((s) => s.currentContext);
  const [search] = useSearchParams()

  const payload = search.get('payload') ?? "";
  const activeNodeId = currentContext?.node_id;

  const sendMutation = useBolt11SendMutation({
    onSuccess: (resp) => {
      nav('/dashboard/send/success?payment_id='
        + encodeURIComponent(resp.payment_id)
        + '&amount=' + encodeURIComponent(amount)
        + '&symbol=sats'
      )
    },
    onError: (err) => {
      toast.error(errorToText(err))
    }
  });

  const rgbContractsQuery = useNodeRgbContractsQuery(activeNodeId);

  const invoiceDecodeQuery = useBolt11DecodeQuery(activeNodeId, payload, {
    retry: 1,
    retryDelay: 200,
  });

  const amount = formatNumber(String(invoiceDecodeQuery.data?.amount_msat ?? '0'), 3)

  return (
    <ContentWrapper>
      <ContentHeader
        title="RGB Payment"
        onBack={() => nav(-1)}
      />
      <Content>
        <div className="text-lg text-center">You Are Sending</div>
        <div className="mt-9 h-10 leading-10 text-center">
          <span className="text-[34px] font-bold">{amount}</span>
          <span className="pl-2 text-[22px]">sats</span>
        </div>
        {/* <div className="mt-2 text-center text-sm text-secondary-foreground">
          <span className="pr-2">Available:</span>
          <WalletBtcBalance
            nodeId={activeNodeId ?? ''}
            onBalanceLoad={(s) => (BigInt(s) * 1000n).toString()}
          />
        </div> */}
        <div className="mt-10 bg-background-3 rounded-3xl p-4">
          <div className="h-5 flex justify-between">
            <label className="text-base text-secondary-foreground">To</label>
            <CopyTextInline
              text={invoiceDecodeQuery.data?.destination ?? ''}
              buttonClassName="text-secondary-foreground"
            />
          </div>
          <div className="bg-background-3 h-[1px] my-4"></div>
          <div className="flex justify-between">
            <label className="text-base text-secondary-foreground">Description</label>
            <div className="text-base">
              {invoiceDecodeQuery.data?.description ?? "-"}
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
              || invoiceDecodeQuery.isPending
              || sendMutation.isPending
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
