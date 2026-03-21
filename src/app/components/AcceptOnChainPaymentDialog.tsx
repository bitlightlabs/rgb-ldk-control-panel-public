import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { downloadTransferConsignmentFromLink, nodeRgbOnchainTransferConsignmentAccept, pluginWalletTransferConsignmentExport } from "@/lib/commands";
import { useMutation } from "@tanstack/react-query";
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

  const acceptPaymentMutation = useMutation({
    mutationFn: async () => {
      if(!props.activeNodeId) {
        throw new Error("No active node selected");
      }
      if(!invoice) {
        throw new Error("Invoice is required");
      }
      if(!consignmentLink || !consignmentLink.startsWith("http")) {
        throw new Error("Consignment link is invalid");
      }

       // Download consignment
      let data = await downloadTransferConsignmentFromLink(consignmentLink);
      if(!data.archive_base64) {
        throw new Error((data as any).message || "Failed to download consignment");
      }

      // Accept payment
      return nodeRgbOnchainTransferConsignmentAccept(props.activeNodeId, invoice, data.archive_base64)
    },
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
              onClick={() => acceptPaymentMutation.mutate()}
            >
              {acceptPaymentMutation.isPending ? "Accepting..." : "Accept"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
