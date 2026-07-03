import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { useNodeWalletNewAddressMutation } from "@/app/mutations";
import { Check, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";


export default function BtcOnchain() {
  const nav = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);
  const [copied, setCopied] = useState(false);
  const [address, setAddress] = useState("");
  const activeNodeId = currentContext?.node_id;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch(e) {}
  }

  const createMutation = useNodeWalletNewAddressMutation({
    onSuccess: (resp) => {
      setAddress(resp.address);
    },
  });

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

  useEffect(() => {
    if (activeNodeId) {
      createMutation.mutate(activeNodeId);
    }
  }, [activeNodeId])

  if(!address) {
    return null;
  }

  return (
    <ContentWrapper>
      <ContentHeader
        title="Bitcoin On-chain Address"
        onBack={() => nav(-1)}
      />
      <Content>
        <div className="pt-3">
          <div className="w-[280px] h-[280px] mx-auto rounded-xl overflow-hidden">
            <QRCodeSVG value={address} size={280} marginSize={2} />
          </div>
          <div className="mt-6 p-4 flex flex-col gap-2 bg-background-3 rounded-2xl">
            <div className="text-base text-secondary-foreground">On-chain Address</div>
            <div className="text-base break-all">{processColor(address)}</div>
          </div>
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
              {copied ? "Copied" : "Copy Address"}
            </Button>
          </div>
        </div>
      </Content>
    </ContentWrapper>
  )
}
