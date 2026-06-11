import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import NetworkMeta from "./NetworkMeta";
import type { NodeContext } from "@/lib/domain";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { nodeMainStatus } from "@/lib/commands";

interface IProps {
  nodeId: string
  contexts: NodeContext[]
  onClose: () => void
}

export default function SwitchNodeDialog(props: IProps) {
  const [online, setOnline] = useState(false)
  const nav = useNavigate()

  const status = async () => {
    if(!props.nodeId) return
    try {
      await nodeMainStatus(props.nodeId)
      setOnline(true)
    } catch(e) {
      setOnline(false)
    }
  }

  const gotoNode = () => {
    nav(`/unlock?node_id=${props.nodeId}&show_back=1`)
    props.onClose();
  }

  useEffect(() => {
    status()
  }, [props.nodeId])

  const context = props.contexts.find((v) => v.node_id === props.nodeId)

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
          <h4 className="text-base font-medium">{context?.display_name}</h4>
          <NetworkMeta
            network={context?.network ?? ''}
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
            disabled={!online}
            onClick={gotoNode}
          >
            Switch to This Node
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
