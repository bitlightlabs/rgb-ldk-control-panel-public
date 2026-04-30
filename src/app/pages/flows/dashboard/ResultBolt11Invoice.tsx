import { Button } from "@/components/ui/button";
import { Check, Copy, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

interface IProps {
  amount: string;
  invoice: string;
  description: string
}
export default function ResultBolt11Invoice(props: IProps) {
  const [copied, setCopied] = useState(false);

  if(!props.invoice) return null;

  return (
    <div>
      <div className="h-5 flex justify-center items-center gap-2">
        <div>
          <Loader2 width={20} height={20} className="animate-spin" />
        </div>
        <div>Waiting for payment</div>
      </div>
      <div className="mt-3 w-[280px] h-[280px] mx-auto rounded-xl overflow-hidden">
        <QRCodeSVG value={props.invoice} size={280} marginSize={2} />
      </div>
      <div className="h-7 mt-6 text-[22px] font-bold text-center">
        {(BigInt(props.amount) / 1000n).toString()} sat
      </div>
      <div className="h-5 mt-6 text-base text-secondary-foreground text-center">
        {props.description}
      </div>
      <div className="mt-10">
        <Button
          type="button"
          variant="outline"
          className="w-full bg-background-3 border-0 rounded-full"
          size="lg"
          onClick={async () => {
            await navigator.clipboard.writeText(props.invoice);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied" : "Copy Invoice"}
        </Button>
      </div>
    </div>
  )
}
