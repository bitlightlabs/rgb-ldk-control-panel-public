export default function Row(props: {label: any, value: any}) {
  return (
    <div className="h-5 flex items-center justify-between">
      <div className="text-base text-secondary-foreground">{props.label}</div>
      <div className="h-full flex items-center gap-2 text-base">
        {props.value}
      </div>
    </div>
  )
}
