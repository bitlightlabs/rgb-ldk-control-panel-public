import ImportStep from "@/app/components/ImportStep";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readText } from '@tauri-apps/plugin-clipboard-manager'

interface IProps {
  invoice: string
  onChangeInvoice: (input: string) => void
  disabled: boolean
  onNext: () => void
}
export default function Export1(props: IProps) {
  const pasteText = async () => {
    try {
      const text = await readText();
      props.onChangeInvoice(text);
    } catch(e) {
      console.log(e)
    }
  }

  return (
    <>
      <ImportStep title="Enter Recipient Invoice" current='01' total="03" />
      <div className="mt-2 text-base text-secondary-foreground leading-5">
        Open your target wallet (e.g., Bitlight Extension) and generate an RGB receiving invoice, then paste it below.
      </div>
      <Field className="mt-10">
        <FieldLabel>
          RGB On-chain Invoice
        </FieldLabel>

        <Textarea
          value={props.invoice}
          onChange={(e) => props.onChangeInvoice(e.currentTarget.value)}
          placeholder="Paste the consignment link here..."
          className="rounded-2xl text-[22px] font-bold min-h-[90px] pr-20"
          action={
            <Button
              variant="destructive"
              className="w-14 h-7 rounded-full text-sm"
              onClick={pasteText}
            >Paste</Button>
          }
        />
      </Field>
      <div className="mt-3 p-4 leading-5 bg-background-3 rounded-3xl text-base text-secondary-foreground">
        How to get the invoice: In your Bitlight Wallet, navigate to the asset you want to receive, click "Receive", and copy the generated invoice.
      </div>
      <div className="mt-10">
        <Button
          size="lg"
          variant="white"
          className="w-full rounded-full"
          disabled={props.disabled}
          onClick={props.onNext}
        >Identify Invoice</Button>
      </div>
    </>
  )
}
