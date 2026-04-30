import { Content, ContentWrapper } from "@/app/components/ContentWrapper";
import CopyText from "@/app/components/CopyText";
import DropMenu from "@/app/components/DropMenu";
import Empty from "@/app/components/Empty";
import Header from "@/app/components/peers/Header";
import IconDisconnect from "@/app/icons/disconnect";
import IconPlus from "@/app/icons/IconPlus";
import { useNodeStore } from "@/app/stores/nodeStore";
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
  nodeMainChannels,
  nodeMainPeers,
  nodeMainPeersDisconnect,
} from "@/lib/commands";
import type { PeerDetailsDto } from "@/lib/sdk/types";
import { formatAddress } from "@/lib/utils";
import {
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function PeersPage() {
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const [disconnectNode, setDisconnectNode] = useState<PeerDetailsDto | null>(null);
  const nav = useNavigate()

  const channelsQuery = useQuery({
    queryKey: ["node_main_channels", activeNodeId],
    queryFn: () => nodeMainChannels(activeNodeId!),
    refetchInterval: false,
    enabled: false
  });

  const checkAndDisconnect = async () => {
    const channelData = await channelsQuery.refetch();
    const channels = channelData.data
    if(!channels) {
      toast.error("Failed to fetch channels");
      return;
    }

    const hasActiveChannel = channels.some(channel => {
      return channel.counterparty_node_id === disconnectNode?.node_id
    })
    console.log("hasActiveChannel", hasActiveChannel)
    if(hasActiveChannel) {
      toast.error("Cannot disconnect peer with active channels.");
      return;
    }

    disConnectMutation.mutate()
  }

  const disConnectMutation = useMutation({
    mutationFn: () => {
      if(!activeNodeId) {
        throw new Error("No active node")
      }

      if(!disconnectNode) {
        throw new Error("No node to disconnect")
      }

      return nodeMainPeersDisconnect(activeNodeId, {
        node_id: disconnectNode.node_id,
      })
    },
    onSuccess: async () => {
      setDisconnectNode(null);
      toast.success(`Peer disconnected`);
      peersQuery.refetch()
    },
    onError: (err) => {
      toast.error(`${err instanceof Error ? err.message : String(err)}`)
    }
  });

  const peersQuery = useQuery({
    queryKey: ["peers", activeNodeId],
    queryFn: () => nodeMainPeers(activeNodeId!),
    refetchInterval: false,
    enabled: !!activeNodeId,
  });
  const list = peersQuery.data ?? [];

  if(peersQuery.isPending) {
    return null
  }

  if(list.length === 0) {
    return (
      <>
        <Header
          onCreateNode={() => nav('/peers/connect')}
        />
        <Content className="mt-0 h-[630px] flex justify-center items-center">
          <Empty
            title="No Nodes Connected"
            subTitle="You haven't connected to any peers yet. Connect to a node to start building your network."
            action={
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full"
                onClick={() => nav('/peers/connect')}
              >
                <IconPlus style={{width: '20px', height: '20px'}} />
                <span>Connect Node</span>
              </Button>
            }
          />
        </Content>
      </>
    )
  }

  return (
    <>
      <Header
        onCreateNode={() => nav('/peers/connect')}
      />

      <Content className="mt-0 px-3">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {/* <TableHead>Node</TableHead> */}
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
                    {/* <TableCell>
                      <span className="text-base">{formatAddress(item.node_id)}</span>
                    </TableCell> */}
                    <TableCell>
                      {
                        item.is_connected
                          ? <Badge variant="success">Connected</Badge>
                          : <Badge variant="secondary">Pending</Badge>
                      }
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex gap-2 items-center">
                        <span>{formatAddress(item.node_id)}</span>
                        <CopyText text={item.node_id} className="text-secondary-foreground" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex gap-2 items-center">
                        <span>{formatAddress(item.address)}</span>
                        <CopyText text={item.address} className="text-secondary-foreground" />
                      </div>
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
                            }
                          }
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            }
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
              Are you sure you want to disconnect from this peer? This will end the active connection.
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
