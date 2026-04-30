import IconSuccess from "@/app/icons/success";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface IProps {
  amount: string;
  symbol: string;
}

export default function PayResult(props: IProps) {
  const { amount, symbol } = props;
  const navigate = useNavigate();

  const goback = () => {
    navigate("/dashboard");
  }

  return (
    <div className="py-3">
      <div className="text-[17px] leading-[22px] text-center">Payment Successful</div>
      <div className="mt-6 flex justify-center">
        <IconSuccess />
      </div>
      <div className="mt-6 h-10 leading-10 text-center">
        <span className="text-[34px] font-bold">{amount}</span>
        <span className="pl-2 text-[22px] font-bold">{symbol}</span>
      </div>
      <div className="mt-10">
        <Button
          size="lg"
          variant="destructive"
          className="w-full rounded-full"
          onClick={goback}
        >Back To Wallet</Button>
      </div>
    </div>
  )
}
