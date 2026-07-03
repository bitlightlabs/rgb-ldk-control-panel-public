import { Content } from "@/app/components/ContentWrapper";
import { CopyTextInline } from "@/app/components/CopyText";
import DropMenu from "@/app/components/DropMenu";
import Empty from "@/app/components/Empty";
import Header from "@/app/components/peers/Header";
import IconDisconnect from "@/app/icons/disconnect";
import IconPlus from "@/app/icons/IconPlus";
import { useContextStore } from "@/app/stores/contextStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  usePeerDisconnectMutation,
} from "@/app/mutations";
import {
  useNodeMainChannelsQuery,
  useNodeMainNodeIdQuery,
  useNodeMainPeersQuery,
} from "@/app/queries";
import type { PeerDetailsDto } from "@/lib/sdk/types";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function PeersPage() {
  const currentContext = useContextStore((s) => s.currentContext);
  const [disconnectNode, setDisconnectNode] = useState<PeerDetailsDto | null>(
    null
  );
  const nav = useNavigate();

  const activeNodeId = currentContext?.node_id ?? "";

  const channelsQuery = useNodeMainChannelsQuery(activeNodeId, {
    refetchInterval: false,
    enabled: false,
  });

  const checkAndDisconnect = async () => {
    const channelData = await channelsQuery.refetch();
    const channels = channelData.data;
    if (!channels) {
      toast.error("Failed to fetch channels");
      return;
    }

    const hasActiveChannel = channels.some((channel) => {
      return channel.counterparty_node_id === disconnectNode?.node_id;
    });
    console.log("hasActiveChannel", hasActiveChannel);
    if (hasActiveChannel) {
      toast.error("Cannot disconnect peer with active channels.");
      return;
    }

    if (!activeNodeId) {
      toast.error("No active node");
      return;
    }

    if (!disconnectNode) {
      toast.error("No node to disconnect");
      return;
    }

    disConnectMutation.mutate({
      nodeId: activeNodeId,
      request: {
        node_id: disconnectNode.node_id,
      },
    });
  };

  const disConnectMutation = usePeerDisconnectMutation({
    onSuccess: async () => {
      setDisconnectNode(null);
      toast.success(`Peer disconnected`);
      peersQuery.refetch();
    },
    onError: (err) => {
      toast.error(`${err instanceof Error ? err.message : String(err)}`);
    },
  });

  const peersQuery = useNodeMainPeersQuery(activeNodeId, {
    refetchInterval: false,
  });
  const list = peersQuery.data ?? [];

  if (peersQuery.isPending) {
    return null;
  }

  if (list.length === 0) {
    return (
      <>
        <Header onCreateNode={() => nav("/dashboard/peers/connect")} />
        <NodeInfo />

        <Content className="mt-4 h-[567px] flex justify-center items-center">
          <Empty
            title="No Nodes Connected"
            subTitle="You haven't connected to any peers yet. Connect to a node to start building your network."
            action={
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full"
                onClick={() => nav("/dashboard/peers/connect")}
              >
                <IconPlus style={{ width: "20px", height: "20px" }} />
                <span>Connect Node</span>
              </Button>
            }
          />
        </Content>
      </>
    );
  }

  return (
    <>
      <Header onCreateNode={() => nav("/dashboard/peers/connect")} />
      <NodeInfo />

      <Content className="mt-4 px-2 py-3">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>STATUS</TableHead>
              <TableHead>PUBKEY</TableHead>
              <TableHead>ADDRESS</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((item) => {
              return (
                <TableRow key={item.node_id} className="h-14">
                  <TableCell>
                    {item.is_connected ? (
                      <Badge variant="success">Connected</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <CopyTextInline
                      text={item.node_id}
                      className="text-sm"
                      buttonClassName="text-secondary-foreground"
                    />
                  </TableCell>
                  <TableCell>
                    <CopyTextInline
                      text={item.address}
                      className="text-sm"
                      buttonClassName="text-secondary-foreground"
                    />
                  </TableCell>
                  <TableCell>
                    <DropMenu
                      direaction="horizontal"
                      variant="ghost"
                      list={[
                        {
                          label: <span className="text-error">Disconnect</span>,
                          icon: <IconDisconnect />,
                          data: item,
                          onClick: (data) => {
                            setDisconnectNode(data);
                          },
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Content>

      <Dialog
        open={!!disconnectNode}
        onOpenChange={() => setDisconnectNode(null)}
      >
        <DialogContent className="w-[400px]">
          <DialogHeader>
            <DialogTitle>Disconnect Peer</DialogTitle>
          </DialogHeader>
          <div>
            <div className="text-base">
              Are you sure you want to disconnect from this peer? This will end
              the active connection.
            </div>
            <div className="mt-6 bg-background-2 rounded-2xl p-3 text-base text-secondary-foreground">
              Node ID: {disconnectNode?.node_id}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              type="button"
              size="lg"
              className="rounded-full flex-1"
              onClick={() => setDisconnectNode(null)}
            >
              Cancel
            </Button>
            <Button
              variant="white"
              type="button"
              size="lg"
              className="rounded-full flex-1"
              disabled={channelsQuery.isPending || disConnectMutation.isPending}
              loading={disConnectMutation.isPending}
              onClick={checkAndDisconnect}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NodeInfo() {
  const currentContext = useContextStore((s) => s.currentContext);

  const nodeIdQuery = useNodeMainNodeIdQuery(currentContext?.node_id);

  const copy = async (v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      toast.success("Copy successful");
    } catch (e) {}
  }

  return (
    <div className="h-20 flex justify-between gap-3">
      <div className="flex-1 rounded-3xl bg-background-3 py-4 px-5 border border-background-2">
        <div className="text-xs text-secondary-foreground leading-[18px]">Pubkey</div>
        <div className="mt-2">
          <CopyTextInline
            text={nodeIdQuery.data?.node_id ?? ''}
            buttonClassName="text-secondary-foreground"
          />
        </div>
      </div>
      <div className="flex-1 rounded-3xl bg-background-3 py-4 px-5 border border-background-2">
        <div className="text-xs text-secondary-foreground leading-[18px]">Address</div>
        <div className="mt-2">
          <CopyTextInline
            text={currentContext?.p2p_listen ?? ''}
            buttonClassName="text-secondary-foreground"
          />
        </div>
      </div>
    </div>
  )
}
