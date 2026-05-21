import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface IProps {
  amountValue: string;
  setAmountValue: (value: string) => void;
  description: string;
  setDescription: (description: string) => void;
}
export default function InvoiceForm(props: IProps) {
  const { amountValue, setAmountValue, description, setDescription } = props;
  return (
    <div className="space-y-8">
      <Field>
        <FieldLabel>
          Amount To Receive
        </FieldLabel>
        <Input
          value={amountValue}
          onChange={(e) => setAmountValue(e.currentTarget.value)}
          inputMode="numeric"
          placeholder="5000"
          className="h-14 rounded-2xl"
          action={<span className="text-base">sat</span>}
        />
      </Field>
      <Field>
        <FieldLabel>Description</FieldLabel>
        <Input
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          className="h-13 rounded-2xl"
        />
      </Field>
    </div>
  )
}
