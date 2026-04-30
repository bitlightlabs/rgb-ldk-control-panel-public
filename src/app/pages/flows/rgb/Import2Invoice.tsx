import AssetAvatar from "@/app/components/AssetAvatar";
import CopyText from "@/app/components/CopyText";
import ImportStep from "@/app/components/ImportStep";
import { Button } from "@/components/ui/button";
import type { RgbContractDto } from "@/lib/sdk/types";
import { formatAddress } from "@/lib/utils";
import { Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface IProps {
  invoice: string
  selectedContract: RgbContractDto | null
  onNext: () => void
}
export default function Import2Invoice(props: IProps) {
  const { invoice, selectedContract } = props;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invoice);
      toast.success("Invoice copied");
    } catch(e) {}
  }

  return (
    <>
      <ImportStep title="Execute Payment" current='03' total="04" />
      <div className="mt-2 text-base text-secondary-foreground leading-5">
        Copy the invoice below and complete the payment via Bitlight Wallet.
      </div>
      <div className="mt-6 py-3 px-4 bg-background-3 rounded-3xl grid grid-cols-2">
        <div className="flex gap-3 items-center">
          <AssetAvatar className="w-8 h-8" name={selectedContract?.name ?? ''} />
          <div>
            <div className="text-sm text-secondary-foreground leading-[18px]">Import Asset</div>
            <div className="mt-1 text-base leading-5">{selectedContract?.name}</div>
          </div>
        </div>
        <div>
          <div className="text-sm text-secondary-foreground leading-[18px]">Contract ID</div>
          <div className="flex items-center gap-2 mt-1 text-base leading-5">
            <span>{formatAddress(selectedContract?.contract_id)}</span>
            <CopyText text={selectedContract?.contract_id ?? ''} className="text-secondary-foreground" />
          </div>
        </div>
      </div>
      <div className="mt-10 w-[280px] h-[280px] mx-auto overflow-hidden rounded-2xl">
        <QRCodeSVG value={invoice} size={280} marginSize={2} />
      </div>
      <div className="mt-6 flex justify-center">
        <Button variant="destructive" className="h-11 rounded-full w-[160px]" onClick={copy}>
          <Copy />
          <span>Copy Invoice</span>
        </Button>
      </div>
      <div className="mt-10">
        <Button
          size="lg"
          variant="white"
          className="w-full rounded-full"
          onClick={props.onNext}
        >I have paid → Continue to Finalize</Button>
      </div>
    </>
  )
}
