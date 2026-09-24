import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useUpdateLspMutation } from "@/app/mutations/lsp";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";
import { useContextStore } from "@/app/stores/contextStore";
import { useNodeLspQuery } from "@/app/queries/lsp";

export default function LspConnectPage() {
  const nav = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  const [pubkey, setPubkey] = useState("");
  const [address, setAddress] = useState("");

  const lspQuery = useNodeLspQuery(activeNodeId, {
    enabled: false,
  })
  const updateMutation = useUpdateLspMutation({
    onError: (e) => {
      toast.error(errorToText(e));
    },
    onSuccess: () => {
      toast.success("Save successfully");
      nav(-1);
    }
  })

  const initForm = async () => {
    try {
      const res = await lspQuery.refetch()
      if(res.data) {
        setPubkey(res.data.pubkey)
        setAddress(res.data.address)
      }
    } catch(e) {
      toast.error(errorToText(e));
    }
  }

  useEffect(() => {
    initForm()
  }, [])

  const save = () => {
    if(!activeNodeId) {
      return
    }

    updateMutation.mutate({
      nodeId: activeNodeId,
      request: {
        pubkey,
        address,
      },
    });
  }

  return (
    <ContentWrapper className="mb-10">
      <ContentHeader title="LSP Connect" onBack={() => nav(-1)} />
      <Content className="space-y-8">
        <Field>
          <FieldLabel>Pubkey</FieldLabel>
          <Input
            placeholder="Node public key"
            value={pubkey}
            onChange={(e) => setPubkey(e.currentTarget.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Address</FieldLabel>
          <Input
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.currentTarget.value)}
          />
        </Field>
        <Button
          type="button"
          variant="white"
          size="lg"
          className="w-full rounded-full"
          disabled={!pubkey || !address}
          loading={updateMutation.isPending}
          onClick={save}
        >
          <span>Save</span>
        </Button>
      </Content>
    </ContentWrapper>
  )
}
