import { Button } from "@/components/ui/button";
import type { MouseEvent } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export default function CopyText(props: { text: string }) {
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
      className="w-8 h-8 mx-3"
      variant="ghost"
      onClick={copy}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Copy />
    </Button>
  );
}
