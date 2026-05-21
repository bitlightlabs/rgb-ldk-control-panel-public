import { BackButton } from "@/app/components/ContentWrapper";
import IconArrowDown from "@/app/icons/arrowdown";
import IconBack from "@/app/icons/back";
import IconDisk from "@/app/icons/disk";
import IconPlus from "@/app/icons/IconPlus";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface IProps {
  onBack: () => void;
}
export default function Local(props: IProps) {
  const nav = useNavigate()

  return (
    <div className="pt-[100px] w-[560px] mx-auto">
      <BackButton
        onClick={props.onBack}
        className="w-9 h-9 flex justify-center items-center rounded-full hover:bg-background-2"
      >
        <IconBack style={{width: '20px', height: '20px'}} />
      </BackButton>

      <div className="mt-6">
        <div className="flex items-center justify-center w-[56px] h-[56px] mx-auto bg-background-2 rounded-2xl">
          <IconDisk />
        </div>
        <h4 className="mt-4 text-3xl text-center font-bold">Setup Local Node</h4>
        <div className="mt-4 text-base text-secondary-foreground text-center">
          Choose an option to get started with your local RGB Lightning Node.
        </div>
        <div className="mt-12 flex flex-col gap-3">
          <Button
            size="xl"
            className="px-5 bg-background-3 hover:bg-background-2 border border-background-2"
            onClick={() => nav('/create-wallet')}
          >
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="w-5 h-5">
                  <IconPlus style={{width: '24px', height: '24px'}} />
                </span>
                <div className="text-left">
                  <h4 className="text-base font-medium">Create New Wallet</h4>
                  <div className="mt-1 font-normal text-xs text-secondary-foreground">
                    Create a new wallet with a fresh seed phrase and set up your node.
                  </div>
                </div>
              </div>
              <div>
                <ArrowRight width={16} height={16} />
              </div>
            </div>
          </Button>
          <Button
            size="xl"
            className="px-5 bg-background-3 hover:bg-background-2 border border-background-2"
            onClick={() => nav('/import-wallet')}
          >
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="w-5 h-5">
                  <IconArrowDown style={{width: '24px', height: '24px'}} />
                </span>
                <div className="text-left">
                  <h4 className="text-base font-medium">Restore Wallet</h4>
                  <div className="mt-1 text-xs  text-secondary-foreground">Restore your wallet using the recovery file and recovery phrase.</div>
                </div>
              </div>
              <div>
                <ArrowRight width={16} height={16} />
              </div>
            </div>
          </Button>
        </div>
      </div>
    </div>
  )
}
