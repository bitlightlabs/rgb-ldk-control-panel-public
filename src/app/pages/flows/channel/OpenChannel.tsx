import AssetSelect from "@/app/components/AssetSelect";
import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import WalletBtcBalance from "@/app/components/WalletBtcBalance";
import { useNodeStore } from "@/app/stores/nodeStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { contextsList, nodeChannelOpen, nodeMainPeers, nodeRgbContracts } from "@/lib/commands";
import type { NodeContext } from "@/lib/domain";
import { errorToText } from "@/lib/errorToText";
import { OpenChannelRequest } from "@/lib/sdk/types";
import { formatAddress } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const MIN_RGB_CHANNEL_SATS = 2_000n;

function buildConsignmentTemplate(base: string): string {
  const trimmed = base.trim();
  if (!trimmed) return "";
  if (trimmed.includes("{txid}")) return trimmed;
  if (trimmed.startsWith("file://")) {
    const path = trimmed.slice("file://".length);
    const clean = path.endsWith("/") ? path.slice(0, -1) : path;
    return `file://${clean}/{txid}`;
  }
  const clean = trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
  return `${clean}/{txid}?format=zip`;
}

function defaultRgbContextData(source: NodeContext | null): string {
  if (!source) return "";
  if (source.rgb_consignment_base_url) {
    return buildConsignmentTemplate(source.rgb_consignment_base_url);
  }
  return "";
}

export function OpenChannel() {
  const nav = useNavigate()
  const activeNodeId = useNodeStore((s) => s.activeNodeId);

  const [channelAmountSats, setChannelAmountSats] = useState("200000"); // 0.002 BTC default
  const [peerNodePubkey, setPeerNodePubkey] = useState("");
  const [peerNodeAddress, setPeerNodeAddress] = useState("");
  const [rgbAssetContractId, setRgbAssetContractId] = useState("");
  const [rgbAssetAmount, setRgbAssetAmount] = useState("");
  const [announce, setAnnounce] = useState("0");

  const [review, setReview] = useState(false);
  // const [nodeType, setNodeType] = useState<string>("local");

  useEffect(() => {
    if (!rgbAssetContractId) return;
    if (BigInt(channelAmountSats) < MIN_RGB_CHANNEL_SATS) {
      setChannelAmountSats(MIN_RGB_CHANNEL_SATS.toString());
    }
  }, [channelAmountSats, rgbAssetContractId]);

  const openMutation = useMutation({
    mutationFn: async () => {
      if(!activeNodeId) {
        throw new Error("No active node selected");
      }

      const currentNode = contextsQuery.data?.find((c) => c.node_id === activeNodeId);
      if(!currentNode) {
        throw new Error("Active node context not found");
      }

      if(!peerNodeAddress || !peerNodePubkey) {
        throw new Error("Peer node info is invalid");
      }

      // Connect
      const precision = selectedContract?.precision ?? 0;
      const req: OpenChannelRequest = {
        node_id: peerNodePubkey.trim(),
        address: peerNodeAddress.trim(),
        channel_amount_sats: channelAmountSats.trim(),
        announce: announce === "1",
        push_to_counterparty_msat: null,
        rgb: rgbAssetContractId
          ? {
            contract_id: rgbAssetContractId.trim(),
            asset_amount: BigInt(
              Number(rgbAssetAmount.trim()) * 10 ** precision
            ).toString(),
            color_context_data: defaultRgbContextData(currentNode),
          }
          : null,
      };
      console.log("Open Channel Request:", req);
      return nodeChannelOpen(activeNodeId, req);
    },
    onSuccess: (resp) => {
      nav(-1)
      // await onOpened(resp);
      // onOpenChange(false);
    },
  });


  const selectLocalPeer = async (pubKey: string) => {
    console.log("Selected peer:", pubKey);

    const selectedNode =  peerList.find((c) => c.node_id === pubKey);
    setPeerNodePubkey(pubKey);
    setPeerNodeAddress(selectedNode?.address ?? '')
  }

  const rgbContractsQuery = useQuery({
    queryKey: ["open_channel_rgb_contracts", activeNodeId],
    queryFn: () => {
      if (!activeNodeId) return null;
      return nodeRgbContracts(activeNodeId);
    },
    refetchInterval: false,
    enabled: !!activeNodeId,
  });

  const selectedContract = useMemo(() => {
    if (!rgbContractsQuery.data) return undefined;
    return rgbContractsQuery.data.contracts.find((c) => c.contract_id === rgbAssetContractId);
  }, [rgbAssetContractId, rgbContractsQuery.data]);

  const contextsQuery = useQuery({
    queryKey: ["contexts"],
    queryFn: contextsList,
    refetchInterval: false,
  });
  // const contexts = contextsQuery.data ?? [];
  // const candidateNodes = contexts.filter((c) => c.node_id !== activeNodeId);

  const peersQuery = useQuery({
    queryKey: ["peers", activeNodeId],
    queryFn: () => nodeMainPeers(activeNodeId!),
    refetchInterval: false,
    enabled: !!activeNodeId,
  });
  const peerList = peersQuery.data ?? [];

  return (
    <>
      <ContentWrapper>
        <ContentHeader title="Open Channel" onBack={() => nav(-1)} />
        <Content>
          <Field >
            <FieldLabel>
              Increase Receiving Capacity
            </FieldLabel>
            <Input
              value={channelAmountSats}
              onChange={(e) => setChannelAmountSats(e.currentTarget.value)}
              placeholder="e.g. 200000"
              inputMode="numeric"
              className="h-13 rounded-2xl text-[22px] font-bold"
              action={<span>sats</span>}
            />
          </Field>

          <Field className="mt-10">
            <FieldLabel>Choose Channel Peer</FieldLabel>
            <Select onValueChange={selectLocalPeer}>
              <SelectTrigger className="h-13 rounded-2xl">
                <SelectValue placeholder="Select Peer" />
              </SelectTrigger>
              <SelectContent>
                {
                  peerList.map((v) => {
                    return <SelectItem key={v.node_id} value={v.node_id}>pubkey: {formatAddress(v.node_id)}</SelectItem>
                  })
                }
              </SelectContent>
            </Select>
          </Field>

          {/* <Field className="mt-10">
            <FieldLabel>
              PeerPubkey
            </FieldLabel>
            <Input
              value={peerNodePubkey}
              onChange={(e) => setPeerNodePubkey(e.currentTarget.value)}
              className="h-13 rounded-2xl text-[22px] font-bold"
            />
          </Field> */}
          {/* <Field className="mt-10">
            <FieldLabel>
              Address
            </FieldLabel>
            <Input
              value={peerNodeAddress}
              onChange={(e) => setPeerNodeAddress(e.currentTarget.value)}
              className="h-13 rounded-2xl text-[22px] font-bold"
            />
          </Field> */}

          <Field className="mt-10">
            <FieldLabel>Public Channel</FieldLabel>
            <Select value={announce} onValueChange={setAnnounce}>
              <SelectTrigger className="h-13 rounded-2xl">
                <SelectValue placeholder="Select Utxo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No</SelectItem>
                <SelectItem value="1">Yes</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field className="mt-10">
            <FieldLabel>Transfer RGB Assets Into the Channel（Optional）</FieldLabel>
            <AssetSelect
              reset={() => {
                setRgbAssetContractId('')
                setRgbAssetAmount('')
              }}
              contracts={rgbContractsQuery.data?.contracts ?? []}
              selectedContractId={rgbAssetContractId}
              setContractId={setRgbAssetContractId}
            />
          </Field>
          <div className="mt-3">
            <Input
              value={rgbAssetAmount}
              onChange={(e) => setRgbAssetAmount(e.currentTarget.value)}
              inputMode="numeric"
              placeholder="e.g. 100"
              className="h-13 rounded-2xl text-[22px] font-bold"
            />
          </div>
          <div className="mt-10">
            <Button
              type="button"
              variant="white"
              className="w-full rounded-full"
              size="lg"
              disabled={!peerNodePubkey || !peerNodeAddress}
              onClick={() => setReview(true)}
            >
              Review
            </Button>
          </div>
        </Content>
      </ContentWrapper>

      {/* Review  */}
      <Dialog
        open={review}
        onOpenChange={() => setReview(false)}
      >
        <DialogContent className="w-[560px]">
          <DialogHeader>
            <DialogTitle>Open Channel</DialogTitle>
          </DialogHeader>
          <div className="bg-background-3 rounded-2xl p-4">
            <h4 className="text-base leading-5 font-medium ">Node Pubkey</h4>
            <div className="text-sm text-secondary-foreground mt-2">
              {peerNodePubkey}
            </div>
          </div>
          <div >
            <div className="bg-background-3 rounded-2xl p-4">
              <div className="h-[18px] text-sm text-secondary-foreground flex justify-between">
                <div>Channel Capacity</div>
                <div>Available: <WalletBtcBalance nodeId={activeNodeId ?? ''} /></div>
              </div>
              <div className="text-[17px] mt-1 font-medium">
               {channelAmountSats} sats
              </div>
              {
                rgbAssetContractId ? (
                  <>
                    <div className="h-[1px] bg-background-3 my-4"></div>
                      <div className="h-[18px] text-sm text-secondary-foreground">
                        Initial RGB Deposit
                      </div>
                      <div className="text-[17px] mt-1 font-medium">
                        {rgbAssetAmount} {selectedContract?.name}
                      </div>
                    </>
                ) : null
              }
            </div>
            <div className="mt-3 text-sm text-secondary-foreground">Assets will be managed via RGB protocol.</div>
          </div>
          <div className="bg-background-3 rounded-2xl p-4">
            <div className="h-5 text-base flex justify-between items-center">
              <div className="text-secondary-foreground">Payment Method</div>
              <div>On-chain</div>
            </div>
          </div>

          {openMutation.isError ? (
            <Alert variant="destructive" data-testid="open-channel-error">
              <AlertDescription>
                {errorToText(openMutation.error)}
              </AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              variant="destructive"
              size="lg"
              type="button"
              className="flex-1 rounded-full"
              onClick={() => setReview(false)}
            >
              Cancel
            </Button>
            <Button
              variant="white"
              size="lg"
              type="button"
              className="flex-1 rounded-full"
              disabled={openMutation.isPending}
              onClick={() => openMutation.mutate()}
            >
              Open Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
