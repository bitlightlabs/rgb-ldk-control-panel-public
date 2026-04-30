interface IProps {
  title: string
  subTitle: string
  action: any
}

export default function Empty(props: IProps) {
  return (
    <div>
      <h4 className="text-base text-center leading-5">{props.title}</h4>
      <div className="mt-2 leading-[18px] text-xs text-center text-secondary-foreground">{props.subTitle}</div>
      <div className="mt-10 flex justify-center">
        {props.action}
      </div>
    </div>
  )
}
