import IconSuccess from "@/app/icons/success";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function PaySuccess() {
  const navigate = useNavigate();
  const [search] = useSearchParams()
  const amount = search.get('amount') ?? "";
  const symbol = search.get('symbol') ?? "";

  const goback = () => {
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="mx-auto mt-4 pt-8 pb-5 px-5 bg-background-3 w-[560px] rounded-3xl">
      <div className="text-lg font-medium leading-[22px] text-center">Payment Successful</div>
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
