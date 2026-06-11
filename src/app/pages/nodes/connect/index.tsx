import {
  Content,
  ContentHeader,
  ContentWrapper,
} from "@/app/components/ContentWrapper";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { nodeMainPeersConnect } from "@/lib/commands";
import type { PeerConnectRequest } from "@/lib/sdk/types";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function PeerConnect() {
  const nav = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);
  const [pubKey, setPubKey] = useState("");
  const [address, setAddress] = useState("");

  const activeNodeId = currentContext?.node_id ?? "";

  const connectMutation = useMutation({
    mutationFn: () => {
      if (!activeNodeId) {
        throw new Error("No active node");
      }

      const req: PeerConnectRequest = {
        node_id: pubKey,
        address,
      };
      return nodeMainPeersConnect(activeNodeId, req);
    },
    onSuccess: async () => {
      toast.success(`Peer connected`);
      nav('/dashboard/peers')
    },
    onError: (err) => {
      toast.error(`${err instanceof Error ? err.message : String(err)}`);
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
              connectMutation.mutate();
            }}
          >
            Connect
          </Button>
        </div>
      </Content>
    </ContentWrapper>
  );
}
