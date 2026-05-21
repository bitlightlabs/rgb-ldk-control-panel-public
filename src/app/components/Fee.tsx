import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface IProps {
  onFeeChange: (v: string) => void
}
interface FeeItem {
  title: string;
  desc: string;
  feeRate: number;
}

export default function Fee(props: IProps) {
  const [loading, setLoading] = useState(false);
  const [feeTitle, setFeeTitle] = useState<string>('Fast');
  const [feeList, setFeeList] = useState<FeeItem[] | null>([
        {
          title: 'Slow',
          desc: '≈ 1 hours',
          feeRate: 1,
        },
        {
          title: 'Avg',
          desc: '≈ 30 mins',
          feeRate: 2
        },
        {
          title: 'Fast',
          desc: '≈ 10 mins',
          feeRate: 3
        }
      ]);

  const selectFee = (item: FeeItem) => {
    setFeeTitle(item.title);
    props.onFeeChange(String(item.feeRate));
  }

  const selectCustomFee = () => {
    setFeeTitle('Custom');
    props.onFeeChange('');
  }

  const inputFee = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if(props.onFeeChange) {
      props.onFeeChange(value);
    }
  }

  return (
    <div className="relative flex flex-col">
      <div className="h-[90px] flex gap-2">
        {
          loading ? (
            [0, 0, 0, 0].map((v, i) => {
              return (
                <div key={i} className="flex-1 rounded-xl h-full bg-background-50 justify-center items-center">
                  <Loader2 className="animate-spin" />
                </div>
              )
            })
          ) : feeList?.map((item) => {
            return (
              <Button
                key={item.title}
                variant="secondary"
                className={"flex-1 rounded-xl h-full border border-transparent hover:bg-background-2 " + (feeTitle === item.title ? " border-background-2 bg-background-2" : "")}
                onClick={() => selectFee(item)}
              >
                <div className="flex flex-col h-full w-full justify-center items-center text-foreground font-normal">
                  <span className="text-base leading-5">{item.title}</span>
                  <span className="mt-1 text-xs leading-[18px]">{item.feeRate} sat/VB</span>
                  <span className="mt-2 text-xs leading-[18px] text-secondary-foreground">{item.desc}</span>
                </div>
              </Button>
            )
          })
        }

        <Button
          variant="secondary"
          className={"flex-1 rounded-xl h-full border border-transparent hover:bg-background-2 " + (feeTitle === 'Custom' ? " border-background-2 bg-background-2" : "")}
          onClick={selectCustomFee}
        >
          <span className="text-foreground">Custom</span>
        </Button>
      </div>

      {
        feeTitle === 'Custom' && (
          <div className="mt-3">
            <Input
              className="bg-background-3"
              action={<span className="text-base">sat/VB</span>}
              onChange={inputFee}
            />
          </div>
        )
      }
    </div>
  )
}
