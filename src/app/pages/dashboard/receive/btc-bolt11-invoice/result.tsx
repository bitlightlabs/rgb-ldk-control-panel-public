import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { Button } from "@/components/ui/button";
import { Check, Copy, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function BtcBolt11InvoiceResult() {
  const nav = useNavigate()
  const [copied, setCopied] = useState(false);
  const [search] = useSearchParams()

  const invoice = search.get('invoice') ?? "";
  const amount = search.get('amount') ?? "";
  const description = search.get('description') ?? "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch(e) {}
  }

  return (
    <ContentWrapper>
      <ContentHeader
        title="BTC Lightning Invoice"
        onBack={() => nav(-1)}
      />
      <Content>
        <div className="h-5 flex justify-center items-center gap-2 text-base">
          <div>
            <Loader2 width={20} height={20} className="animate-spin" />
          </div>
          <div>Waiting for payment</div>
        </div>
        <div className="mt-6 w-[280px] h-[280px] mx-auto rounded-xl overflow-hidden">
          <QRCodeSVG value={invoice} size={280} marginSize={2} />
        </div>
        <div className="h-7 mt-6 text-[22px] font-bold text-center">
          {amount} sats
        </div>
        {
          description !== "" ? (
          <div className="h-5 mt-6 text-base text-secondary-foreground text-center">
            {description}
          </div>
          ) : null
        }
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
