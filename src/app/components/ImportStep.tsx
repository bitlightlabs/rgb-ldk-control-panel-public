interface IProps {
  title: string
  total: string
  current: string
}

export default function ImportStep(props: IProps) {
  return (
    <div className="flex justify-between">
      <div className="text-[22px] font-bold">{props.title}</div>
      <div>
        <span className="text-[22px] font-bold">{props.current}</span>
        <span className="text-base text-secondary-foreground">/{props.total}</span>
      </div>
    </div>
  )
}
