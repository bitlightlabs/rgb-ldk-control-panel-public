import IconSuccess from "@/app/icons/success";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface IProps {
  amount: string
  assetName: string
}
export default function ExportDone(props: IProps) {
  const nav = useNavigate()

  const goback = () => {
    nav("/dashboard", { replace: true });
  }

  return (
    <div>
      <div className="pt-3 text-[17px] text-center">RGB Assets Exported</div>
      <div className="mt-2 text-base text-secondary-foreground text-center">
        Moved out of your Lightning Node
      </div>
      <div className="flex justify-center mt-6">
        <IconSuccess />
      </div>
      <div className="mt-6 text-center">
        <span className="text-[34px] font-bold">{props.amount}</span>
        <span className="text-[22px] font-bold pl-2">{props.assetName}</span>
      </div>
      <div className="mt-10">
          <Button
            size="lg"
            variant="white"
            className="w-full rounded-full"
            onClick={goback}
          >Back To Wallet</Button>
        </div>
    </div>
  )
}
