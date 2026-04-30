import AssetAvatar from "@/app/components/AssetAvatar";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

interface IProps {
  address: string
}
export default function ResultOnchainBtc(props: IProps) {
  const [copied, setCopied] = useState(false);

  const processColor = (str: string) => {
    const prefix = str.slice(0, 8);
    const suffix = str.slice(-8);
    const middle = str.slice(8, -8);

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
      <div className="w-[280px] h-[280px] mx-auto rounded-xl overflow-hidden">
        <QRCodeSVG value={props.address} size={280} marginSize={2} />
      </div>
      <div className="mt-6 p-4 flex flex-col gap-4 bg-background-3 rounded-2xl">
        <div className="text-base text-secondary-foreground">On-chain Address</div>
        <div className="text-base break-all">{processColor(props.address)}</div>
      </div>
      <div className="mt-10">
        <Button
          type="button"
          variant="outline"
          className="w-full bg-background-3 border-0 rounded-full"
          size="lg"
          onClick={async () => {
            await navigator.clipboard.writeText(props.address);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied" : "Copy Address"}
        </Button>
      </div>
    </div>
  )
}
