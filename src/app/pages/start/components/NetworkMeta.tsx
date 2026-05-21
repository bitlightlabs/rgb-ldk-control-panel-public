import IconDisk from "@/app/icons/disk";
import { Badge } from "@/components/ui/badge";

interface IProps {
  network: string
  type: "Local" | "Remote"
}

export default function NetworkMeta(props: IProps) {
  const network = props.network.toUpperCase();

  let variant: any = 'warning'
  if(network.includes('TEST')) {
    variant = 'success'
  } else if(network.includes('REGTEST')) {
    variant = 'purple'
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <Badge variant={variant}>
        {props.network.toUpperCase()}
      </Badge>
      <div className="flex items-center gap-1 text-secondary-foreground text-xs">
        <div className="opacity-50">
          <IconDisk style={{ width: "14px", height: "14px" }} />
        </div>
        <span className="text-xs">{props.type}</span>
      </div>
    </div>
  )
}
