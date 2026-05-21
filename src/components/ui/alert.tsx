import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import IconAlert from "@/app/icons/alert"
import IconSuccess from "@/app/icons/success"

const alertVariants = cva(
  "relative w-full rounded-3xl px-4 py-4 text-base [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        success: "bg-success/8 [&>svg]:text-success",
        destructive:
          "bg-error/8 text-white dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 text-base font-medium leading-5 tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {icon?: 'alert' | 'success'}
>(({ className, children, icon = 'alert', ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-base flex gap-4 [&_p]:leading-relaxed", className)}
    {...props}
  >
    <div className="w-5 h-5">
      {icon === "alert" ? <IconAlert /> : <IconSuccess style={{width: '20px', height: '20px'}} />}
    </div>
    <div className="text-base font-normal">{children}</div>
  </div>
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
