import { cn } from "@/lib/utils"

export default function Row(props: {label: any, value: any, className?: string}) {
  return (
    <div className={cn("h-5 flex items-center justify-between text-base", props.className)}>
      <div className="text-secondary-foreground">{props.label}</div>
      <div className="h-full flex items-center gap-2">
        {props.value}
      </div>
    </div>
  )
}
