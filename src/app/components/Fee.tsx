import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useContextStore } from "../stores/contextStore";
import { getNetworkOption } from "../config/networkOptions";
import { BitcoinNetwork } from "@/lib/domain";
import { useWalletRecommendedFeesQuery } from "@/app/queries";

interface IProps {
  onFeeChange: (v: string) => void
}
interface FeeItem {
  title: string;
  desc: string;
  feeRate: number;
}

export default function Fee(props: IProps) {
  const [feeTitle, setFeeTitle] = useState<string>('Avg');
  const [feeList, setFeeList] = useState<FeeItem[] | null>(null);
  const currentContext = useContextStore((state) => state.currentContext);
  const onFeeChangeRef = useRef(props.onFeeChange);
  const config = currentContext
    ? getNetworkOption(currentContext.network as BitcoinNetwork)
    : null;
  const feesQuery = useWalletRecommendedFeesQuery(config?.fee);

  const selectFee = (item: FeeItem) => {
    setFeeTitle(item.title);
    onFeeChangeRef.current(String(item.feeRate));
  }

  const selectCustomFee = () => {
    setFeeTitle('Custom');
    onFeeChangeRef.current('');
  }

  const inputFee = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onFeeChangeRef.current(value);
  }

  useEffect(() => {
    onFeeChangeRef.current = props.onFeeChange;
  }, [props.onFeeChange]);

  useEffect(() => {
    if (!feesQuery.data) return;

    setFeeList([
      {
        title: 'Slow',
        desc: '≈ 1 hours',
        feeRate: feesQuery.data.hourFee,
      },
      {
        title: 'Avg',
        desc: '≈ 30 mins',
        feeRate: feesQuery.data.halfHourFee
      },
      {
        title: 'Fast',
        desc: '≈ 10 mins',
        feeRate: feesQuery.data.fastestFee
      }
    ])

    onFeeChangeRef.current(String(feesQuery.data.halfHourFee));
  }, [feesQuery.data]);

  return (
    <div className="relative flex flex-col">
      <div className="h-[90px] flex gap-2">
        {
          feesQuery.isLoading ? (
            [0, 0, 0, 0].map((v, i) => {
              return (
                <div key={i} className="flex-1 flex rounded-xl h-full bg-background-3 justify-center items-center">
                  <Loader2 className="animate-spin" />
                </div>
              )
            })
          ) : feeList?.map((item) => {
            return (
              <Button
                key={item.title}
                variant="secondary"
                className={
                  "bg-background-4 flex-1 rounded-xl h-full border border-transparent hover:bg-background-2 "
                  + (feeTitle === item.title ? " border-background-2 bg-background-2" : "")
                }
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
          className={"bg-background-4 flex-1 rounded-xl h-full border border-transparent hover:bg-background-2 " + (feeTitle === 'Custom' ? " border-background-2 bg-background-2" : "")}
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
              slot={<span className="text-base">sat/VB</span>}
              onChange={inputFee}
            />
          </div>
        )
      }
    </div>
  )
}
