import ImportStep from "@/app/components/ImportStep";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { readText } from '@tauri-apps/plugin-clipboard-manager'

interface IProps {
  contractIdInput: string
  setContractIdInput: (input: string) => void
  disabled: boolean
  onNext: () => void
}
export default function Import1(props: IProps) {
  const { contractIdInput, setContractIdInput } = props;

  const pasteText = async () => {
    try {
      const text = await readText();
      setContractIdInput(text);
    } catch(e) {
      console.log(e)
    }
  }

  return (
    <>
    <ImportStep title="Identify" current={'01'} total="04" />
    <div className="mt-10">
      <Field>
        <FieldLabel>Contract ID</FieldLabel>
        <Input
          value={contractIdInput}
          onChange={(e) => setContractIdInput(e.currentTarget.value)}
          placeholder="Contract ID"
          inputMode="numeric"
          className="h-13 rounded-2xl text-[22px] font-bold pr-20"
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
        <div>Only assets in Bitlight Wallet are supported.</div>
        <div className="mt-2">Ensure the asset has at least one confirmed transaction.</div>
      </div>
      <div className="mt-10">
        <Button
          size="lg"
          variant="white"
          className="w-full rounded-full"
          disabled={props.disabled}
          onClick={props.onNext}
        >Identify Asset</Button>
      </div>
    </div>
    </>
  )
}
