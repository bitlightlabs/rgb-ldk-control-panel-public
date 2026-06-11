import { cn } from "@/lib/utils"

export default function CustomTooltip({children, className = ''}: {children: React.ReactNode, className?: string}) {
  return (
    <div
      className={
        cn(
          "hidden w-[200px] left-1/2 -top-[50px] -translate-x-1/2 absolute z-100 rounded-2xl bg-background-solid px-3 py-2 text-xs text-secondary-foreground animate-in fade-in-0",
          className
        )
      }
    >
      {children}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-5 h-2 bg-background-solid [clip-path:polygon(0_0,100%_0,50%_100%)]"></div>
    </div>
  )
}
