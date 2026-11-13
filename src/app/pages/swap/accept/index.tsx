import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { useNodeRgbContractsQuery } from "@/app/queries";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { nodeSwapDecode } from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import type { RgbContractDto, SwapInfoDto } from "@/lib/sdk/generated-types";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AcceptDialog from "../components/AcceptDialog";

export default function Accept() {
  const nav = useNavigate();
  const [error, setError] = useState(false);
  const [payload, setPayload] = useState('');
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [contract, setContract] = useState<RgbContractDto | null>(null);
  const [decodedSwap, setDecodedSwap] = useState<SwapInfoDto | null>(null);
  const { currentContext } = useContextStore();
  const activeNodeId = currentContext?.node_id;

  const contractsQuery = useNodeRgbContractsQuery(activeNodeId, {
    staleTime: 30_000,
  });
  const list = contractsQuery.data?.contracts ?? [];

  const changePayload = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPayload(e.target.value);
    setError(false);
  }

  const decodeSwap = async () => {
    if(!activeNodeId) {
      return
    }

    try {
      const data = await nodeSwapDecode(activeNodeId, payload);
      const contractId = data.contract_id;
      const contract = list.find((c) => c.contract_id === contractId);

      if(!contract) {
        setError(true);
        return
      }

      setContract(contract || {} as RgbContractDto);
      setDecodedSwap(data);
      setShowAcceptDialog(true);
    } catch(e) {
      toast.error(errorToText(e));
    }
  }

  return (
    <>
      <ContentWrapper>
        <ContentHeader
          title="Accept Swap"
          onBack={() => nav(-1)}
        />
        <Content className="space-y-8">
          <Field data-invalid={error}>
            <FieldLabel>Recipient</FieldLabel>
            <Textarea
              value={payload}
              onChange={changePayload}
              placeholder="Paste Swap String"
              className="min-h-[52px] resize-y rounded-3xl"
            />
            {
              error ? (<FieldError>Invalid Swap</FieldError>) : null
            }
          </Field>
          <div>
            <Button
              type="button"
              size="lg"
              variant="white"
              className="w-full rounded-full"
              disabled={payload === '' || contractsQuery.isPending}
              onClick={decodeSwap}
            >
              Accept
            </Button>
          </div>
        </Content>
      </ContentWrapper>

      {
        showAcceptDialog ? (
          <AcceptDialog
            swapString={payload}
            contract={contract}
            data={decodedSwap}
            onClose={() => setShowAcceptDialog(false)}
            onSuccess={() => {
              setPayload('');
              setDecodedSwap(null);
              setContract(null);
            }}
          />
        ) : null
      }
    </>
  )
}

