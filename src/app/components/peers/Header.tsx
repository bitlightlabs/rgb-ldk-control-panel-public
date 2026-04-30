import { useNodeStore } from "@/app/stores/nodeStore";
import { Button } from "@/components/ui/button";
import Pubkey from "../nodes/Pubkey";
import IconPlus from "@/app/icons/IconPlus";

interface IProps {
  onCreateNode: () => void
}
export default function Header(props: IProps) {
  const activeNodeId = useNodeStore((s) => s.activeNodeId);

  return (
    <div className="sticky top-0 z-40 flex h-[68px] justify-between items-center ">
      <div className="h-full flex gap-4 items-center">
        <h4 className="text-[22px] font-bold">Node</h4>
        <div className="h-8 text-xs flex items-center gap-3 rounded-full bg-background-2 px-4 text-secondary-foreground">
          <span>pubkey: </span>
          <Pubkey activeNodeId={activeNodeId} />
        </div>
      </div>
      <div>
        <Button
          variant="white"
          className="w-[150px] rounded-full"
          onClick={props.onCreateNode}
        >
          <IconPlus style={{width: '20px', height: '20px'}} />
          <span>Connect Node</span>
        </Button>
      </div>
    </div>
  )
}
