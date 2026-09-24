import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

type ListItem = {label: string, value: string};
interface IProps {
  list: ListItem[];
  onChange: (value: string) => void;
}
export default function SwitchButtons(props: IProps) {
  const { list } = props;
  const [customValue, setCustomValue] = useState<string>('');
  const [selectLabel, setSelectLabel] = useState<string>(list[0].label);

  useEffect(() => {
    props.onChange(list[0].value);
  }, [])

  const selectItem = (item: ListItem) => {
    setSelectLabel(item.label);
    setCustomValue('');
    props.onChange(item.value);
  }

  const customInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if(isNaN(Number(value))) {
      return;
    }

    setCustomValue(value);
    props.onChange(value);
  }

  return (
    <div className="relative flex flex-col">
      <div className="h-13 flex gap-2">
        {
          list?.map((item) => {
            return (
              <Button
                key={item.value}
                variant="secondary"
                className={
                  "bg-background-4 flex-1 rounded-2xl h-full border border-transparent hover:bg-background-2 "
                  + (selectLabel === item.label ? " border-background-muted bg-background-2" : "")
                }
                onClick={() => selectItem(item)}
              >
                <div className="flex flex-col h-full w-full justify-center items-center text-foreground font-medium">
                  <span className="text-base leading-5">{item.label}</span>
                </div>
              </Button>
            )
          })
        }

        <Button
          variant="secondary"
          className={"bg-background-4 flex-1 rounded-2xl h-full border border-transparent hover:bg-background-2 " + (selectLabel === 'Custom' ? " border-background-muted bg-background-2" : "")}
          onClick={() => setSelectLabel('Custom')}
        >
          <span className="text-foreground">Custom</span>
        </Button>
      </div>

      {
        selectLabel === 'Custom' && (
          <div className="mt-3">
            <Input
              placeholder="0"
              className="bg-background-4"
              slot={<span className="text-base font-medium">months</span>}
              value={customValue}
              onChange={customInput}
            />
          </div>
        )
      }
    </div>
  )
}
