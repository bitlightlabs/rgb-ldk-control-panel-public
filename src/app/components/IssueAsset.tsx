import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRgbContractIssueMutation } from "@/app/mutations";
import { useNodeRgbIssuersQuery } from "@/app/queries";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";
import IssuerList from "./IssuerList";
import RgbUtxoSelect from "./RgbUtxoSelect";
import { useState } from "react";

interface IProps {
  activeNodeId: string;
  onClose: () => void;
  onSuccess: () => void;
}
export default function IssueAsset(props: IProps) {
  const { activeNodeId } = props;
  const [utxo, setUtxo] = useState<string | null>(null);

  const getIssuers = useNodeRgbIssuersQuery(activeNodeId);

  const issueAsset = useRgbContractIssueMutation({
    onSuccess: () => {
      props.onSuccess();
      props.onClose();
    },
    onError: (e) => {
      toast.error(errorToText(e));
    }
  });

  const submitIssue = () => {
    try {
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
        precision,
        utxo: utxo as string,
      }

      if(!activeNodeId) {
        throw new Error("No active node selected");
      }
      if(!data.issuer_name
        || !data.contract_name
        || !data.ticker
        || !data.issued_supply
        || !data.precision
        || !utxo
      ) {
        throw new Error("Please fill all the fields");
      }

      console.log('Issuing asset with data ', data);
      issueAsset.mutate({ nodeId: activeNodeId, request: data })
    } catch (e) {
      toast.error(errorToText(e));
    }
  };

  const issuerList = getIssuers.data?.issuers ?? [];

  return (
    <Dialog open onOpenChange={() => props.onClose()}>
      <DialogContent className="w-[600px]">
        <DialogHeader>
          <DialogTitle>Issue Asset</DialogTitle>
        </DialogHeader>

        <IssuerList
          activeNodeId={activeNodeId}
        />

        <form id="issue-asset-form" className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="recv_rgb_contract_id">
              Issuer
            </FieldLabel>
            <Select name="issuer_name">
              <SelectTrigger id="recv_rgb_contract_id">
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
          <Field>
            <FieldLabel htmlFor="recv_rgb_contract_id">
              UTXO
            </FieldLabel>
            <RgbUtxoSelect
              onChangeUtxo={setUtxo}
            />
          </Field>
        </form>
        <div className="mt-4">
          <Button
            disabled={issueAsset.isPending}
            variant="white"
            className="w-full rounded-full"
            onClick={submitIssue}
          >Issue Asset</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
