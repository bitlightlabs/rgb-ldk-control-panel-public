import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

export default function Exit() {
  const [show, setShow] = useState(false);

  const hide = () => {
    getCurrentWindow().hide()
    setShow(false);
  }
  const shutDown = () => {
    getCurrentWindow().destroy()
  }

  const processCloseRequest = () => {
    setShow(true);
  }

  useEffect(() => {
    globalThis.addEventListener('@app-close-requested', processCloseRequest)

    return () => {
      globalThis.removeEventListener('@app-close-requested', processCloseRequest)
    }
  }, [])

  if(!show) {
    return null
  }

  return (
    <Dialog open onOpenChange={() => setShow(false)}>
      <DialogContent className="w-[400px]">
        <DialogHeader>
          <DialogTitle>Confirm Shutdown</DialogTitle>
        </DialogHeader>
        <div className="text-base">
          <div>
            Are you sure you want to shut down your RGB Lightning Node?
          </div>
          <div className="mt-3">
            RGB Lightning Node needs to stay online to send and receive transactions.
            Channels may be closed if your hub stays offline for an extended period of time.
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="white"
            size="lg"
            className="rounded-full flex-1"
            onClick={hide}
          >
            No
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="rounded-full flex-1"
            onClick={shutDown}
          >
            Shut Down
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
