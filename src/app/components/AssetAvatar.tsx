import { getGradientStyle } from "@/lib/utils";
import { cn } from "@/lib/utils"

export default function AssetAvatar({ name, className = '' }: { name: string, className?: string }) {
  const first = (name.trim().charAt(0) || "?").toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white",
        className
      )}
      style={{ background: getGradientStyle(name) }}
    >
      {first}
    </span>
  );
}
