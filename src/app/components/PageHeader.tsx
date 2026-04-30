interface IProps {
  title: string
  action: any
}
export default function PageHeader(props: IProps) {
  return (
    <div className="sticky top-0 z-40 h-[68px] flex justify-between items-center">
      <h4 className="text-[22px] font-bold">{props.title}</h4>
      {props.action}
    </div>
  )
}
