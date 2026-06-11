import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface IProps {
  onOk: () => void
  onClose: () => void
}

export default function CreateNodeTip(props: IProps) {
  return (
    <Dialog
      open
      onOpenChange={props.onClose}
    >
      <DialogContent className="w-[400px] px-5 py-5">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create New Node?</DialogTitle>
        </DialogHeader>
        <div>
          This will log you out of your current node. Please ensure your
          recovery phrase and backup files are safely stored before proceeding.
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
            onClick={props.onOk}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
