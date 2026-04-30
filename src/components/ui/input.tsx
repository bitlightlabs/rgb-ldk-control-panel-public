import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & {action?: any}>(
  ({ className, type, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            "focus-visible:ring-1 focus-visible:ring-ring flex rounded-md border border-input h-10 w-full bg-transparent px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm font-normal placeholder:text-lg placeholder:font-normal placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className
          )}
          ref={ref}
          {...props}
        />
        <div className="absolute z-50 top-0 bottom-0 right-4 flex items-center">{props.action}</div>
      </div>
    )
  }
)
Input.displayName = "Input"

const ComplexInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & {action?: any, bottom?: any}>(
  ({ className, type, ...props }, ref) => {
    return (
      <div className={cn(
        "relative p-4 rounded-md border border-input focus-within:ring-1 focus-within:ring-ring",
        className
      )}>
        <div className="absolute top-5 right-4 flex items-center">{props.action}</div>
        <input
          type={type}
          className="flex h-7 w-full border-0 bg-transparent text-base transition-colors file:border-0 file:bg-transparent file:text-sm font-normal file:text-foreground placeholder:font-normal placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          ref={ref}
          {...props}
        />
        <div className="mt-2">{props.bottom}</div>
      </div>
    )
  }
)
ComplexInput.displayName = "ComplexInput"

export { Input, ComplexInput }
