import IconCloud from "@/app/icons/cloud";
import IconDisk from "@/app/icons/disk";
import logoDarkAnimation from "@/assets/logo_dark.json";
import { Button } from "@/components/ui/button";
import Lottie from "lottie-react";

interface IProps {
  onLocal: () => void;
  onRemote?: () => void;
}
export default function Welcome(props: IProps) {
  return (
    <div className="pt-[100px] px-6">
      <div className="flex justify-center">
        <Lottie
          animationData={logoDarkAnimation}
          loop
          autoplay
          style={{ width: 80, height: 80 }}
        />
      </div>
      <div className="mt-4 text-2xl font-bold text-center">
        RGB LIGHTNING NODE
      </div>
      <div className="mt-4 mx-auto text-secondary-foreground text-base text-center">
        Lightning Network with RGB protocol support.
        <br />
        Set up a new node or connect to an existing instance.
      </div>

      <div className="mt-10 grid grid-cols-2 gap-5">
        <div className="h-auto px-8 py-8 rounded-3xl bg-background-3 border border-background-2 hover:bg-background-2 justify-start text-left">
          <div className="w-[56px] h-[56px] flex items-center justify-center bg-background-3 rounded-2xl">
            <IconDisk style={{ width: "24px", height: "24px" }} />
          </div>
          <div className="mt-5 font-bold text-xl">Local Node</div>
          <div className="h-15 leading-5 mt-2 text-base font-normal text-secondary-foreground whitespace-break-spaces">
            Run a local node instance. Optimized for development and testing
            workflows.
          </div>
          <div className="mt-5">
            <Button
              variant="white"
              className="rounded-full"
              onClick={props.onLocal}
            >
              Setup Local Node
            </Button>
          </div>
        </div>
        <div className="h-auto px-8 py-8 rounded-2xl bg-background-3 border border-background-2 hover:bg-background-2 justify-start text-left">
          <div className="w-[56px] h-[56px] flex items-center justify-center bg-background-3 rounded-2xl">
            <IconCloud style={{ width: "24px", height: "24px" }} />
          </div>
          <div className="mt-5 font-bold text-xl">Remote Node</div>
          <div className="h-15 leading-5 mt-2 text-base font-normal text-secondary-foreground whitespace-break-spaces">
            Connect to a hosted or self-managed node instance. Suitable for
            production and scalable setups.
          </div>
          <div className="mt-5">
            <Button
              variant="white"
              className="rounded-full"
              disabled
              onClick={props.onRemote}
            >
              Coming Soon
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
