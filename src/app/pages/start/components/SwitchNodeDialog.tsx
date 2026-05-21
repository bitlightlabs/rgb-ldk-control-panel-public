import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import NetworkMeta from "./NetworkMeta";
import type { NodeContext } from "@/lib/domain";
import { useNavigate } from "react-router-dom";

interface IProps {
  context: NodeContext
  onClose: () => void
}

export default function SwitchNodeDialog(props: IProps) {
  const nav = useNavigate()

  const gotoNode = () => {
    nav('/unlock?show_back=1')
    props.onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={props.onClose}
    >
      <DialogContent className="w-[400px] px-5 py-5">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Switch Node</DialogTitle>
        </DialogHeader>
        <div>
          Your network connection will switch to this node. Proceed if this is intended.
        </div>
        <div className="bg-background-3 rounded-2xl px-3 py-3">
          <h4 className="text-base font-medium">{props.context.display_name}</h4>
          <NetworkMeta
            network={props.context.network}
            type={"Local"}
          />
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            type="button"
            size="lg"
            className="rounded-full flex-1"
            onClick={props.onClose}
          >
            Cancel
          </Button>
          <Button
            variant="white"
            type="button"
            size="lg"
            className="rounded-full flex-1"
            onClick={gotoNode}
          >
            Switch to This Node
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
