import { getGradientStyle } from "@/lib/utils";
import { cn } from "@/lib/utils"
import BTCIcon from '@/assets/btc.png'

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
      {name.toUpperCase() === 'BTC'
        ? <img src={BTCIcon} alt="BTC" style={{width: '100%', height: '100%'}} />
        : first
      }
    </span>
  );
}
