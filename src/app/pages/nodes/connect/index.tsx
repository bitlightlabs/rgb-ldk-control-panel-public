import {
  Content,
  ContentHeader,
  ContentWrapper,
} from "@/app/components/ContentWrapper";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { usePeerConnectMutation } from "@/app/mutations";
import type { PeerConnectRequest } from "@/lib/sdk/types";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";

export default function PeerConnect() {
  const nav = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);
  const [pubKey, setPubKey] = useState("");
  const [address, setAddress] = useState("");

  const activeNodeId = currentContext?.node_id ?? "";

  const connectMutation = usePeerConnectMutation({
    onSuccess: async () => {
      toast.success(`Peer connected`);
      nav('/dashboard/peers')
    },
    onError: (e) => {
      toast.error(errorToText(e));
    },
  });

  return (
    <ContentWrapper>
      <ContentHeader title="Connect Node" onBack={() => nav(-1)} />
      <Content>
        <div className="space-y-8">
          <Field>
            <FieldLabel>Pubkey</FieldLabel>
            <Input
              value={pubKey}
              onChange={(e) => setPubKey(e.currentTarget.value)}
              placeholder="Node public key"
              className="h-13 rounded-2xl"
            />
          </Field>
          <Field>
            <FieldLabel>Address</FieldLabel>
            <Input
              value={address}
              onChange={(e) => setAddress(e.currentTarget.value)}
              placeholder="host:port (e.g. 127.0.0.1:9735)"
              className="h-13 rounded-2xl"
            />
          </Field>

          <Button
            variant="white"
            type="button"
            size="lg"
            className="w-full rounded-full flex-1"
            disabled={!pubKey || !address || connectMutation.isPending}
            loading={connectMutation.isPending}
            onClick={() => {
              if (!activeNodeId) {
                toast.error("No active node");
                return;
              }

              const req: PeerConnectRequest = {
                node_id: pubKey,
                address,
              };
              connectMutation.mutate({ nodeId: activeNodeId, request: req });
            }}
          >
            Connect
          </Button>
        </div>
      </Content>
    </ContentWrapper>
  );
}
