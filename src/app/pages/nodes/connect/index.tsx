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
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUpdateLspMutation } from "@/app/mutations/lsp";

export default function PeerConnect() {
  const nav = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);
  const [pubKey, setPubKey] = useState("");
  const [address, setAddress] = useState("");
  const [tab, setTab] = useState<string>('Peers'); // Peers or LSPs

  const activeNodeId = currentContext?.node_id ?? "";

  const changeTab = (tab: string) => {
    setPubKey("");
    setAddress("");
    setTab(tab);
  }

  const updateMutation = useUpdateLspMutation({
    onSuccess: () => {
      toast.success("Save successfully");
      nav('/dashboard/peers')
    },
    onError: (e) => {
      toast.error(errorToText(e));
    },
  })

  const connectMutation = usePeerConnectMutation({
    onSuccess: async () => {
      toast.success(`Peer connected`);
      nav('/dashboard/peers')
    },
    onError: (e) => {
      toast.error(errorToText(e));
    },
  });

  const connectNode = async () => {
    if (!activeNodeId) {
      return;
    }

    if(tab === 'Peers') {
      connectMutation.mutate({
        nodeId: activeNodeId,
        request: { node_id: pubKey, address }
      });
    } else {
      updateMutation.mutate({
        nodeId: activeNodeId,
        request: {
          pubkey: pubKey,
          address: address,
          // token: null,
          trust_peer_0conf: true,
          trust_peer_no_reserve: false
        }
      })
    }
  }

  return (
    <ContentWrapper>
      <ContentHeader title="Connect Node" onBack={() => nav(-1)} />
      <Content>
        <Tabs value={tab} onValueChange={changeTab}>
          <TabsList className="h-10 inline-flex items-center justify-start w-auto rounded-full bg-background gap-1">
            <TabsTrigger
              className="h-8 px-4 rounded-full text-base"
              value="Peers"
            >
              Peers
            </TabsTrigger>
            <TabsTrigger
              className="h-8 px-4 rounded-full text-base"
              value="LSPs"
            >
              LSPs
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="mt-4 space-y-8">
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
            disabled={!pubKey || !address}
            loading={connectMutation.isPending || updateMutation.isPending}
            onClick={connectNode}
          >
            Connect
          </Button>
        </div>
      </Content>
    </ContentWrapper>
  );
}