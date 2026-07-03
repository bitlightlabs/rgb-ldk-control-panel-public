import IconDanger from "@/app/icons/danger";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface IProps {
  onClose: () => void;
}
export default function ForgetDialog(props: IProps) {
  const [error, setError] = useState(false);
  const [resetText, setResetText] = useState("");
  const nav = useNavigate();

  const changeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResetText(e.target.value);
    setError(false);
  }

  const reset = () => {
    if (resetText === "RESET") {
      nav("/");
    } else {
      setError(true);
    }
  };

  return (
    <Dialog open onOpenChange={props.onClose}>
      <DialogContent
        className="w-[560px] px-5 pt-8 pb-5"
        overlayClassName="backdrop-blur-none"
      >
        <DialogHeader>
          <div>
            <div className="w-16 h-16 rounded-full bg-error/12 flex items-center justify-center">
              <IconDanger />
            </div>
            <DialogTitle className="mt-4 text-xl font-bold">
              Reset Node?
            </DialogTitle>
          </div>
        </DialogHeader>
        <div>
          <div className="text-base">
            If you have forgotten your password, a manual reset of the RGB
            Lightning Node is required. This process will wipe all local data
            stored on this node. Ensure you have a secure backup before
            proceeding.
          </div>
          <div className="mt-4 text-base">
            Enter "RESET" to initialize the reset process.
          </div>
          <Field className="mt-8" data-invalid={error}>
            <Input
              className="w-full bg-background-4"
              onChange={changeInput}
              value={resetText}
            />
            <FieldError>{error ? "Incorrect" : ""}</FieldError>
          </Field>
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
            onClick={reset}
          >
            Confirm Reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
