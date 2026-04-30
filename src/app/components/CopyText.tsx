import { Button } from "@/components/ui/button";
import type { MouseEvent } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from '@/lib/utils'

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
        cn("w-4 h-4 px-0", className)
      }
      variant="ghost"
      onClick={copy}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Copy />
    </Button>
  );
}
