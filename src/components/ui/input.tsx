import * as React from "react"

import { cn } from "@/lib/utils"
import { Eye, EyeClosed } from "lucide-react"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & {slot?: any, subfix?: any}>(
  ({ className, type, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            "focus-visible:ring-1 focus-visible:ring-ring flex rounded-2xl border border-input h-13 w-full bg-transparent px-3 py-1 text-lg transition-colors file:border-0 file:bg-transparent font-normal placeholder:text-lg placeholder:font-normal placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
        <div className="absolute z-50 top-0 bottom-0 right-4 flex items-center">{props.slot}</div>
        <div className="absolute z-50 top-0 bottom-0 right-0 flex items-center">{props.subfix}</div>
      </div>
    )
  }
)
Input.displayName = "Input"

const ComplexInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & {slot?: any, top?: any, bottom?: any, subfix?: any}>(
  ({ className, type, slot, top, bottom, subfix, ...props }, ref) => {
    return (
      <div className={cn(
        "relative p-4 rounded-2xl bg-background-3 border border-input focus-within:ring-1 focus-within:ring-ring",
        className
      )}>
        <div className="absolute top-4 right-4 flex items-center">{slot}</div>
        {top}
        <input
          type={type}
          className="flex h-7 w-full border-0 bg-transparent text-lg transition-colors font-normal placeholder:font-normal placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          ref={ref}
          {...props}
        />
        {subfix}
        <div className="mt-3">{bottom}</div>
      </div>
    )
  }
)
ComplexInput.displayName = "ComplexInput"

const PasswordInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & {iconSize?: 'normal' | 'big', prefix?: any, slot?: any, subfix?: any, display?: boolean, toggleType?: (type: string) => void}>(
  ({ className, prefix, display = false, iconSize = 'normal', ...props }, ref) => {
    const [show, setShow] = React.useState(false)
    const type = show ? "text" : "password"

    const iconPx = iconSize === 'normal' ? '16px' : '20px'

    React.useEffect(() => {
      setShow(display)
    }, [display])

    const toggleEye = () => {
      let next = !show
      setShow(next)
      if (props.toggleType) {
        props.toggleType(next ? "text" : "password")
      }
    }

    return (
      <div className="relative">
        {
          prefix ? (
            <div className="absolute z-50 top-0 bottom-0 left-4 flex items-center text-base text-secondary-foreground">
              {prefix}
            </div>
          ) : null
        }
        <input
          autoComplete="off"
          type={type}
          className={cn(
            "focus-visible:ring-1 focus-visible:ring-ring flex rounded-2xl border border-input h-13 w-full bg-transparent px-3 py-1 text-lg transition-colors font-normal placeholder:text-lg placeholder:font-normal placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            className,
            prefix ? "pl-10" : ""
          )}
          ref={ref}
          {...props}
        />
        <div className="absolute z-50 top-0 bottom-0 right-2 flex gap-1 items-center">
          {
            props.slot ? props.slot : (
              <button
                type="button"
                className={
                  cn(
                    "flex text-secondary-foreground hover:text-foreground items-center justify-center w-7 h-7 rounded-full hover:bg-background-2",
                    iconSize === 'big' ? "w-9 h-9" : ""
                  )
                }
                onClick={toggleEye}
              >
                {show
                  ? <Eye style={{width: iconPx, height: iconPx}} />
                  : <EyeClosed style={{width: iconPx, height: iconPx}} />
                }
              </button>
            )
          }
          {props.subfix}
        </div>
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

const OneDot = <span className="inline-flex w-[6px] h-[6px] rounded-full bg-foreground" />
const Dot = <div className="flex h-full items-center gap-1">{OneDot}{OneDot}{OneDot}{OneDot}{OneDot}{OneDot}</div>
const PasswordSpan = ({ className, prefix, display = false, iconSize = 'normal', ...props }: any) => {
  const [show, setShow] = React.useState(false)

  const iconPx = iconSize === 'normal' ? '16px' : '20px'

  React.useEffect(() => {
    setShow(display)
  }, [display])

  const toggleEye = () => {
    let next = !show
    setShow(next)
    if (props.toggleType) {
      props.toggleType(next ? "text" : "password")
    }
  }

  return (
    <div className="relative">
      {
        prefix ? (
          <div className="absolute z-50 top-0 bottom-0 left-4 flex items-center text-base text-secondary-foreground">
            {prefix}
          </div>
        ) : null
      }
      <div
        onClick={toggleEye}
        className={cn(
          "flex items-center rounded-2xl border border-input h-10 w-full bg-transparent px-3 text-base transition-colors font-normal cursor-pointer",
          className,
          prefix ? "pl-9" : ""
        )}
      >
        {
          show ? props.value : Dot
        }
      </div>
      <div className="absolute z-50 top-0 bottom-0 right-3 flex gap-1 items-center">
        {
          props.slot ? props.slot : (
            <button
              type="button"
              className={
                cn(
                  "flex items-center justify-center w-7 h-7 rounded-full hover:bg-background-2",
                  iconSize === 'big' ? "w-9 h-9" : ""
                )
              }
              onClick={toggleEye}
            >
              {show
                ? <Eye className="text-secondary-foreground" style={{width: iconPx, height: iconPx}} />
                : <EyeClosed className="text-secondary-foreground" style={{width: iconPx, height: iconPx}} />
              }
            </button>
          )
        }
        {props.subfix}
      </div>
    </div>
  )
}
PasswordSpan.displayName = "PasswordSpan"

export { Input, ComplexInput, PasswordInput, PasswordSpan }
