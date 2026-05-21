import { Button } from "@/components/ui/button";
import IconCheck, { IconCheckOn } from "../icons/check";
import { useState } from "react";

interface IProps {
  onChange: (checked: boolean) => void
}
export default function CheckButton(props: IProps) {
  const [checked, setChecked] = useState(false)

  const handleClick = () => {
    const newChecked = !checked
    setChecked(newChecked)
    props.onChange(newChecked)
  }

  return (
    <Button
      type="button"
      className="w-5 h-5 px-0 py-0 rounded-full bg-transparent"
      onClick={handleClick}
    >
      {
        checked ? <IconCheckOn /> : <IconCheck />
      }
    </Button>
  )
}
