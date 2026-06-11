export default function NodeStatus({ onLine }: { onLine: boolean }) {
  return (
    <div
      className="absolute -right-[2px] bottom-0 w-[10px] h-[10px] border-[2px] border-background rounded-full"
      style={{backgroundColor: onLine ? "var(--success)" : "var(--secondary-foreground)"}}
    />
  )
}
