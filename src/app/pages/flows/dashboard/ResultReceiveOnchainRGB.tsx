import AssetAvatar from "@/app/components/AssetAvatar";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface IProps {
  utxo: string;
  assetName: string;
  amount: string;
  invoice: string;
}
export default function ResultReceiveOnchainRGB(props: IProps) {
  const [copied, setCopied] = useState(false);

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
    <div>
      <div className="flex flex-col gap-2.5 items-center">
        <AssetAvatar name="asdf" className="w-14 h-14" />
        <div className="font-bold text-[22px]">${props.assetName}</div>
      </div>
      <div className="mt-10 p-4 flex flex-col gap-4 bg-background-3 rounded-2xl">
        <div className="flex justify-between">
          <label className="text-base text-secondary-foreground">Amount to Receive</label>
          <div className="text-base font-medium">{props.amount} ${props.assetName}</div>
        </div>
        <div className="flex justify-between">
          <label className="text-base text-secondary-foreground">UTXO</label>
          <div className="text-base font-medium max-w-1/2">{props.utxo}</div>
        </div>
      </div>
      <div className="mt-10 p-4 flex flex-col gap-4 bg-background-3 rounded-2xl">
        <div className="text-base text-secondary-foreground">RGB Invoice</div>
        <div className="text-base break-all">{processInvoice(props.invoice)}</div>
      </div>
      <div className="mt-3 text-sm text-secondary-foreground text-center">Please send only RGB assets to this invoice.</div>
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
