import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CopyButton({ className, value }: { className?: string; value: string }) {
  const [copying, setCopying] = useState(false)
  const id = useRef(0)

  const copy = async () => {
    try {
      setCopying(true)
      await navigator.clipboard.writeText(value);
      toast.success("Copied successfully");

      id.current = setTimeout(() => {
        setCopying(false)
        clearTimeout(id.current)
      }, 2000) as unknown as number

    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Button
      variant="destructive"
      size="lg"
      className={cn(`text-base rounded-full`, className)}
      onClick={copy}
    >
      {copying ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {copying ? "Copied" : "Copy"}
    </Button>
  )
}
