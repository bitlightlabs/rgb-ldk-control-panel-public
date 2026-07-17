import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { contextsUpdateImage } from "@/lib/commands";
import { useState } from "react";
import { LDK_IMAGE } from "../config/constant";
import { ensureDockerImage } from "@/lib/docker";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";

interface IProps {
  nodeId: string;
  onStart: () => void;
  onClose: () => void;
}

export default function UpdateImage(props: IProps) {
  const [loading, setLoading] = useState(false)

  const update = async () => {
    try {
      setLoading(true)

      await contextsUpdateImage(props.nodeId, LDK_IMAGE)
      await ensureDockerImage(LDK_IMAGE)
      props.onStart()
      props.onClose()

    } catch(e) {
      toast.error(errorToText(e))
    } finally {
      setLoading(false)
    }
  }

  const start = () => {
    props.onStart()
    props.onClose()
  }

  return (
    <Dialog
      open
      onOpenChange={props.onClose}
    >
      <DialogContent className="w-[400px] px-5 py-5">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Upgrade Image</DialogTitle>
        </DialogHeader>
        <div>
          A new image has been released. Do you want to upgrade the current nodes to the latest version?
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            type="button"
            size="lg"
            className="rounded-full flex-1"
            disabled={loading}
            onClick={start}
          >
            Start
          </Button>
          <Button
            variant="white"
            type="button"
            size="lg"
            className="rounded-full flex-1"
            loading={loading}
            onClick={update}
          >
            Upgrade And Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
