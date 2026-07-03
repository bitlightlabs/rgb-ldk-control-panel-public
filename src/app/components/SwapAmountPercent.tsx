import { cn } from "@/lib/utils"

interface IProps {
  list: {value: number}[]
  value: number
  onChange: (value: number) => void
}

export default function SwapAmountPercent(props: IProps) {
  const {list, value, onChange} = props

  return (
    <div className="flex gap-1">
      {list.map((v) => {
        return (
          <button
            className={
              cn(
                "h-5 w-11 px-0 py-0 flex items-center justify-center text-2xs rounded-full text-secondary-foreground bg-background-3 hover:text-foreground",
                value === v.value && 'text-foreground'
              )
            }
            onClick={() => onChange(v.value)}
          >
            {v.value}%
          </button>
        )
      })}
    </div>
  )
}
