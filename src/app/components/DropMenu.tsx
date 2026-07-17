import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Ellipsis, EllipsisVertical } from "lucide-react";
import IconTriangleDown from "../icons/triangle";

interface IProps {
  disabled?: boolean
  className?: string
  variant?: "ghost" | "destructive"
  direaction: 'vertical' | 'horizontal'
  list: {
    disabled?: boolean
    label: any
    icon: any
    data: any
    onClick: (data: any) => void
  }[],
}

export default function DropMenu(props: IProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={props.variant ? props.variant : "destructive"}
          type="button"
          className={cn("w-8 h-8 px-0 py-0 rounded-full", props.className ?? '')}
        >
          {props.direaction === 'vertical' ? (
              <EllipsisVertical />
            ) : (
              <Ellipsis />
            )
          }
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {
          props.list.map((item, index) => {
            return (
              <DropdownMenuItem
                key={index}
                disabled={item.disabled || props.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick(item.data);
                }}
              >
                {item.icon}
                {item.label}
              </DropdownMenuItem>
            )
          })
        }
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ButtonDropMenu(props: IProps & {value: string}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={props.variant ? props.variant : "destructive"}
          type="button"
          className={cn("py-0 pl-4 pr-2 text-xs rounded-full gap-1", props.className ?? '')}
        >
          <span>{props.value}</span>
          <IconTriangleDown
            opacity={1}
            className="text-foreground [[data-state=open]>&]:rotate-180"
            style={{width: '20px', height: '20px'}}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="space-y-2">
        {
          props.list.map((item, index) => {
            return (
              <DropdownMenuItem
                key={index}
                className="py-0 h-10 px-3"
                disabled={item.disabled || props.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick(item.data);
                }}
              >
                {item.icon}
                {item.label}
              </DropdownMenuItem>
            )
          })
        }
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
