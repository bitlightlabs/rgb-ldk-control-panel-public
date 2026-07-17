import { Button } from "@/components/ui/button";
import type { MouseEvent } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn, formatAddress } from '@/lib/utils'

export default function CopyText(props: { text: string, className?: string }) {
  const {className = ''} = props;

  const copy = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(props.text);
      toast.success("Copy successful");
    } catch (e) {}
  };

  return (
    <Button
      className={
        cn("w-4 h-4 px-0 hover:[&_svg]:text-foreground", className)
      }
      variant="ghost"
      onClick={copy}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Copy />
    </Button>
  );
}

export function CopyTextInline(
  props: {
    text: string,
    className?: string,
    buttonClassName?: string
    length?: number,
  }
) {
  const {className = '', buttonClassName = '', length = 20} = props;

  const copy = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(props.text);
      toast.success("Copy successful");
    } catch (e) {}
  };

  return (
    <div
      className={cn("text-base font-normal h-5 flex items-center gap-2", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className="cursor-pointer"
        onClick={copy}
      >{formatAddress(props.text, length)}</span>
      <Button
        className={
          cn("w-4 h-4 px-0 hover:[&_svg]:text-foreground", buttonClassName)
        }
        variant="ghost"
        onClick={copy}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Copy />
      </Button>
    </div>
  );
}
