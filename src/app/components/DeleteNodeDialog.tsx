import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import IconDanger from "../icons/danger";

interface IProps {
  show: boolean
  nodeId: string
  onClose: () => void
  pending: boolean
  onSubmit: (nodeId: string) => void
}

export default function DeleteNodeDialog(props: IProps) {
  return (
    <Dialog
      open={props.show}
      onOpenChange={props.onClose}
    >
      <DialogContent className="w-[400px] px-5 py-8">
        <DialogHeader>
          <div>
            <div className="w-16 h-16 rounded-full bg-error/12 flex items-center justify-center">
              <IconDanger />
            </div>
            <DialogTitle className="mt-4 text-xl font-bold">Delete Node</DialogTitle>
          </div>
        </DialogHeader>
        <div>
          <div className="text-base">
            Are you sure you want to delete the node "Meta Port"?
          </div>
          <ul className="mt-4 p-3 bg-background-2 rounded-3xl list-disc pl-8 text-base leading-5 grid gap-3">
            <li>This action cannot be undone</li>
            <li>If you haven't backed up your node, you will permanently lose access to your funds</li>
            <li>All local node data will be permanently deleted</li>
            <li>Data path to be deleted: rgb lightning node-meta-port</li>
          </ul>
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
            variant="error"
            type="button"
            size="lg"
            className="rounded-full flex-1"
            disabled={props.pending}
            onClick={() => {
              props.onSubmit(props.nodeId);
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
