import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Ellipsis, EllipsisVertical } from "lucide-react";

interface IProps {
  className?: string
  variant?: "ghost" | "destructive"
  direaction: 'vertical' | 'horizontal'
  list: {
    disabled?: boolean
    label: any
    icon: any
    data: any
    onClick: (data: any) => void
  }[]
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
          {
            props.direaction === 'vertical' ? (
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
                disabled={item.disabled}
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
