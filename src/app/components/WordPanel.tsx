import { Field } from "@/components/ui/field"
import { PasswordInput, PasswordSpan } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

interface IProps {
  loading?: boolean
  words: string
}

export default function WordPanel(props: IProps) {
  const split = props.words.trim().split(" ")

  if(props.loading) {
    return (
      <div className="h-[100px] flex justify-center items-center">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {
        split.map((v, i) => {
          return (
            <Field key={i}>
              <PasswordSpan
                value={v}
                className="h-10 bg-background-4 disabled:opacity-100"
                prefix={i + 1}
                disabled
              />
            </Field>
          )
        })
      }
    </div>
  )
}
