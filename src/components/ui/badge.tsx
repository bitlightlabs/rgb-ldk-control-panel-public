import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-border px-2 py-0.5 text-2xs font-normal transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-background-3 text-secondary-foreground",
        secondary:
          "border-transparent bg-background-2 text-secondary-foreground",
        success:
          "border-transparent bg-success/12 text-success",
        warning:
          "border-transparent bg-warning/12 text-warning",
        purple:
          "border-transparent bg-purple/12 text-purple",
        destructive:
          "border-transparent bg-destructive/12 text-destructive",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
