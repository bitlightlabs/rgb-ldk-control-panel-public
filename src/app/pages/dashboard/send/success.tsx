import IconSuccess from "@/app/icons/success";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function PaySuccess() {
  const navigate = useNavigate();
  const [search] = useSearchParams()
  const amount = search.get('payload') ?? "";
  const symbol = search.get('symbol') ?? "";

  const goback = () => {
    navigate("/dashboard", { replace: true });
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
