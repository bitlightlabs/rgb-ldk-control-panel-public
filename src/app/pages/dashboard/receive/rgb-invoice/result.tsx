import AssetAvatar from "@/app/components/AssetAvatar";
import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export function RGBInvoiceResult() {
  const nav = useNavigate()
  const [copied, setCopied] = useState(false);
  const [search] = useSearchParams()

  const invoice = search.get('invoice') ?? "";
  const name = search.get('name') ?? "";
  const amount = search.get('amount') ?? "";
  const btcCarrier = search.get('btc_carrier') ?? "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch(e) {}
  }

  const processInvoice = (invoice: string) => {
    const prefix = invoice.slice(0, 8);
    const suffix = invoice.slice(-8);
    const middle = invoice.slice(8, -8);

    return (
      <span>
        <span className="text-[#6D7CFF]">{prefix}</span>
        <span>{middle}</span>
        <span className="text-[#6D7CFF]">{suffix}</span>
      </span>
    );
  }

  return (
    <ContentWrapper>
      <ContentHeader
        title="RGB Lightning Invoice"
        onBack={() => nav(-1)}
      />
      <Content>
        <div className="flex flex-col gap-2.5 items-center">
          <AssetAvatar name="asdf" className="w-14 h-14" />
          <div className="font-bold text-[22px]">${name}</div>
        </div>
        <div className="mt-8 p-4 flex flex-col gap-4 bg-background-3 rounded-2xl">
          <div className="flex justify-between">
            <label className="text-base text-secondary-foreground">Amount to Receive</label>
            <span className="text-base font-medium">{amount} ${name}</span>
          </div>
          <div className="flex justify-between">
            <label className="text-base text-secondary-foreground">BTC Carrier</label>
            <span className="text-base font-medium">{btcCarrier} sats</span>
          </div>
        </div>
        <div className="mt-3 p-4 flex flex-col gap-2 bg-background-3 rounded-2xl">
          <div className="text-base text-secondary-foreground">RGB Invoice</div>
          <div className="text-base break-all">{processInvoice(invoice)}</div>
        </div>
        <div className="mt-3 text-xs text-secondary-foreground text-center">Please send only RGB assets to this invoice.</div>
        <div className="mt-8">
          <Button
            type="button"
            variant="outline"
            className="w-full bg-background-3 border-0 rounded-full"
            size="lg"
            onClick={copy}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy Invoice"}
          </Button>
        </div>
      </Content>
    </ContentWrapper>
  )
}
