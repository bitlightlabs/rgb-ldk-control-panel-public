import IconTriangleDown from "@/app/icons/triangle";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";

interface IProps {
  onChange: (val: number) => void
}

export default function WordSwitch({ onChange }: IProps) {
  const [words, setWords] = useState(12)

  const changeValue = (val: number) => {
    setWords(val)
    onChange(val)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-6 px-2 rounded-full border-0 text-xs font-normal"
        >
          <span>{words}-word</span>
          <IconTriangleDown style={{width: '20px', height: '20px'}} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
          <DropdownMenuItem onClick={() => changeValue(12)}>12-word</DropdownMenuItem>
          <DropdownMenuItem onClick={() => changeValue(24)}>24-word</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
