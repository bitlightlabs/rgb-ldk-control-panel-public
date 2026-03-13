import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { nodeRgbContractIssue, nodeRgbIssuers } from "@/lib/commands";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface IProps {
  activeNodeId: string;
  onClose: () => void;
  onSuccess: () => void;
}
export default function IssueAsset(props: IProps) {
  const { activeNodeId } = props;

  const getIssuers = useQuery({
    queryKey: ["issuers-list", activeNodeId],
    queryFn: async () => {
      if(!activeNodeId) return null;
      const data = await nodeRgbIssuers(activeNodeId)

      return data.issuers
    }
  });

  const issueAsset = useMutation({
    mutationFn: async () => {
      const form = document.getElementById('issue-asset-form') as HTMLFormElement
      const formData = new FormData(form)

      const precision = parseInt(formData.get('precision') as string);
      const total = formData.get('issued_supply') as string;
      const issued_supply = (BigInt(total) * BigInt(10 ** precision)).toString();

      const data = {
        issuer_name: formData.get('issuer_name') as string,
        contract_name: formData.get('contract_name') as string,
        ticker: formData.get('ticker') as string,
        issued_supply,
        precision
      }

      if(!activeNodeId) {
        throw new Error("No active node selected");
      }
      if(!data.issuer_name || !data.contract_name || !data.ticker || !data.issued_supply || !data.precision) {
        throw new Error("Please fill all the fields");
      }

      console.log('Issuing asset with data ', data);

      return nodeRgbContractIssue(activeNodeId, data)
    },
    onSuccess: () => {
      props.onSuccess();
      props.onClose();
    },
    onError: (error) => {
      console.error('Issue asset error ', error);
      toast.error((error as Error).message || "Failed to issue asset");
    }
  });

  const issuerList = getIssuers.data ?? [];

  return (
    <Dialog modal={false} open onOpenChange={() => props.onClose()}>
      <DialogContent className="w-[600px]">
        <DialogHeader>
          <DialogTitle>Issue Asset</DialogTitle>
        </DialogHeader>

        <form id="issue-asset-form" className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="recv_rgb_contract_id">
              Issuer
            </FieldLabel>
            <Select name="issuer_name">
              <SelectTrigger id="recv_rgb_contract_id" className="h-10">
                <SelectValue placeholder="Select a issuer" />
              </SelectTrigger>
              <SelectContent>
                {issuerList.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="recv_rgb_contract_id">
              Asset Name
            </FieldLabel>
            <Input name="contract_name" />
          </Field>
          <Field>
            <FieldLabel htmlFor="recv_rgb_contract_id">
              Ticker
            </FieldLabel>
            <Input name="ticker" />
          </Field>
          <Field>
            <FieldLabel htmlFor="recv_rgb_contract_id">
              Precision
            </FieldLabel>
            <Input name="precision" />
          </Field>
          <Field>
            <FieldLabel htmlFor="recv_rgb_contract_id">
              Total Supply
            </FieldLabel>
            <Input name="issued_supply" />
          </Field>
        </form>
        <div className="mt-4">
          <Button
            disabled={issueAsset.isPending}
            type="button"
            className="w-full"
            onClick={() => issueAsset.mutate()}
          >Issue Asset</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
