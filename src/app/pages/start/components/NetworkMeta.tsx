import IconCloud from "@/app/icons/cloud";
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

  const TypeCom = props.type === 'Local' ? IconDisk : IconCloud

  return (
    <div className="mt-2 flex items-center gap-2">
      <Badge variant={variant} className="bg-background/30">
        {props.network.toUpperCase()}
      </Badge>
      <div className="flex items-center gap-1 text-secondary-foreground">
        <div className="opacity-50">
          <TypeCom style={{ width: "14px", height: "14px" }} />
        </div>
        <span className="text-2xs">{props.type}</span>
      </div>
    </div>
  )
}
