import { Button } from "@/components/ui/button";
import { NETWORK_OPTIONS } from "../config/networkOptions";

interface IProps {
  value: "regtest" | "mainnet" | "testnet" | "testnet4"
  onSelect: (network: "regtest" | "mainnet" | "testnet" | "testnet4") => void
}
export default function NetworkSwitch({ value, onSelect }: IProps) {
  return (
    <div className="flex gap-4">
      {NETWORK_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          variant="default"
          disabled={opt.enabled === false}
          onClick={() => onSelect(opt.value)}
          className={[
            "px-2 font-medium rounded-full text-xs disabled:text-muted-foreground bg-background-2 disabled:bg-background-2 border border-transparent",
            value === opt.value
              ? "bg-background-muted hover:bg-background-muted border border-muted-foreground"
              : "",
          ].join(" ")}
        >
          {opt.iconSrc ? (
            <img src={opt.iconSrc} alt="" className="h-5 w-5" />
          ) : null}
          {opt.label.toUpperCase()}
        </Button>
      ))}
    </div>
  )
}
