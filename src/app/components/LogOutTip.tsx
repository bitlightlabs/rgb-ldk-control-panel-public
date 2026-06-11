import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface IProps {
  loading: boolean
  onOk: () => void
  onClose: () => void
}

export default function LogOutTip(props: IProps) {
  return (
    <Dialog
      open
      onOpenChange={props.onClose}
    >
      <DialogContent className="w-[400px]">
        <DialogHeader>
          <DialogTitle>Log Out?</DialogTitle>
        </DialogHeader>
        <div className="text-base">
          <div>
            Logging out will disconnect your current session from the RGB
            Lightning Node.
          </div>
          <div className="mt-3">
            Please ensure all operations are completed and data is saved.
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="rounded-full flex-1"
            onClick={props.onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="error"
            size="lg"
            className="rounded-full flex-1"
            disabled={props.loading}
            loading={props.loading}
            onClick={props.onOk}
          >
            Confirm Logout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
