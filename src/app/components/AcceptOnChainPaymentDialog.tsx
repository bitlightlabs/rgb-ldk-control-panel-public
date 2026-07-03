import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRgbOnchainTransferConsignmentAcceptMutation } from "@/app/mutations";
import { useState } from "react";
import { toast } from "sonner";

interface IProps {
  activeNodeId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AcceptOnChainPaymentDialog(props: IProps) {
  const [consignmentLink, setConsignmentLink] = useState("");
  const [invoice, setInvoice] = useState("");

  const acceptPaymentMutation = useRgbOnchainTransferConsignmentAcceptMutation({
    onSuccess: () => {
      toast.success(`Payment accepted`);
      setConsignmentLink("");
      props.onSuccess();
      props.onClose();
    },
    onError: (e) => {
      toast.error((e as Error).message);
    }
  })

  const acceptPayment = () => {
    if(!props.activeNodeId) {
      toast.error("No active node selected");
      return;
    }
    if(!invoice) {
      toast.error("Invoice is required");
      return;
    }
    if(!consignmentLink || !consignmentLink.startsWith("http")) {
      toast.error("Consignment link is invalid");
      return;
    }
    acceptPaymentMutation.mutate({
      nodeId: props.activeNodeId,
      consignmentLink,
      invoice,
    });
  }

  return (
     <Dialog modal={false} open onOpenChange={() => props.onClose()}>
      <DialogContent>
        <form className='flex flex-col gap-4'>
          <DialogHeader>
            <DialogTitle>Accept Payment</DialogTitle>
          </DialogHeader>
          <Field>
            <Label>Invoice</Label>
            <Textarea
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
            />
          </Field>
          <Field>
            <Label>Consignment Link</Label>
            <Input
              type="text"
              value={consignmentLink}
              placeholder="Consignment download paht"
              onChange={(e) => setConsignmentLink(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              disabled={!consignmentLink || acceptPaymentMutation.isPending}
              onClick={acceptPayment}
            >
              {acceptPaymentMutation.isPending ? "Accepting..." : "Accept"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
