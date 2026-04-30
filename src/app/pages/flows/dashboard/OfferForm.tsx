import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface IProps {
  description: string;
  setDescription: (value: string) => void;
}
export default function OfferForm(props: IProps) {
  const { description, setDescription } = props;
  return (
    <div className="space-y-10">
      <div className="text-base text-secondary-foreground bg-background-3 rounded-3xl p-4">
        BOLT-12 is not supported by all wallets and nodes in the lightning network. This feature will work only if you have a channel with a node that supports onion message forwarding, and are paid by a lightning wallet that supports paying BOLT-12 offers.
      </div>
      {/* <Field className="mt-10">
        <FieldLabel>
          Amount
        </FieldLabel>
        <Input
          value={amountValue}
          onChange={(e) => setAmountValue(e.currentTarget.value)}
          inputMode="numeric"
          placeholder="5000000"
          className="h-14 rounded-2xl text-[22px] font-bold"
          action={<span className="text-base">msat</span>}
        />
      </Field> */}
      <Field>
        <FieldLabel>Description</FieldLabel>
        <Input
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          className="h-13 rounded-2xl text-[22px] font-bold"
        />
      </Field>
    </div>
  )
}
