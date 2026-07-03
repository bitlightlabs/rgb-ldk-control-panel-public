import AssetBalance from "@/app/components/AssetBalance";
import AssetSelect from "@/app/components/AssetSelect";
import {
  Content,
  ContentHeader,
  ContentWrapper,
} from "@/app/components/ContentWrapper";
import RgbUtxoBalance from "@/app/components/RgbUtxoBalance";
import WalletBtcBalance from "@/app/components/WalletBtcBalance";
import { useContextStore, type UserContext } from "@/app/stores/contextStore";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { ComplexInput } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useChannelOpenMutation,
} from "@/app/mutations";
import { useNodeMainPeersQuery, useNodeRgbContractsQuery } from "@/app/queries";
import { errorToText } from "@/lib/errorToText";
import { OpenChannelRequest, PeerDetailsDto, RgbContractDto } from "@/lib/sdk/types";
import { formatAddress } from "@/lib/utils";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import EmptyNodes from "../components/EmptyNodes";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import IconHelp from "@/app/icons/help";

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

function defaultRgbContextData(source: UserContext | null): string {
  if (!source) return "";
  if (source.rgb_consignment_base_url) {
    return buildConsignmentTemplate(source.rgb_consignment_base_url);
  }
  return "";
}

export default function OpenChannel() {
  const nav = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;
  const [type, setType] = useState<string>("BTC");

  const peersQuery = useNodeMainPeersQuery(activeNodeId, {
    refetchInterval: false,
  });
  const peerList = peersQuery.data ?? [];


  return (
    <ContentWrapper className="mb-10">
      <ContentHeader title="Open Channel" onBack={() => nav(-1)} />
      <Content>
        <Tabs value={type} onValueChange={setType}>
          <TabsList className="h-10 px-1 py-1 inline-flex bg-background gap-1 rounded-full">
            <Trigger page="BTC" />
            <Trigger page="RGB" />
          </TabsList>
        </Tabs>

        {type === "BTC"
          ? <BtcForm peers={peerList} />
          : <RGBForm peers={peerList} />
        }
      </Content>
    </ContentWrapper>
  );
}

function Trigger(props: {page: string}) {
  return (
    <TabsTrigger
      className="flex-1 px-0 py-0 h-8 w-20 rounded-full cursor-pointer data-[state=active]:bg-background-2 hover:bg-background-2"
      value={props.page}
    >
      {props.page}
    </TabsTrigger>
  )
}

function BtcForm(props: {peers: PeerDetailsDto[]}) {
  const [review, setReview] = useState(false);
  const [channelAmountSats, setChannelAmountSats] = useState("")
  const [peerNodePubkey, setPeerNodePubkey] = useState("");
  const [peerNodeAddress, setPeerNodeAddress] = useState("");
  const [announce, setAnnounce] = useState("0");
  const nav = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);
  const btcBalance = useRef("0");

  const activeNodeId = currentContext?.node_id;
  const peerList = props.peers;

  const selectLocalPeer = async (pubKey: string) => {
    console.log("Selected peer:", pubKey);

    const selectedNode = peerList.find((c) => c.node_id === pubKey);
    setPeerNodePubkey(pubKey);
    setPeerNodeAddress(selectedNode?.address ?? "");
  };

  const preview = () => {
    // check input
    if(BigInt(channelAmountSats || "0") < BigInt(MIN_RGB_CHANNEL_SATS)) {
      toast.error(`The minimum amount is ${MIN_RGB_CHANNEL_SATS} sats. Please increase the channel capacity and try again.`)
      return
    }

    // Check balance
    if(BigInt(channelAmountSats) >= BigInt(btcBalance.current)) {
      toast.error("Insufficient receiving capacity.")
      return
    }

    setReview(true);
  }

  const openMutation = useChannelOpenMutation({
    onSuccess: (resp) => {
      nav(-1);
    },
  });

  const submitOpen = () => {
    if (!activeNodeId) {
      toast.error("No active node selected");
      return;
    }

    if (!peerNodeAddress || !peerNodePubkey) {
      toast.error("Peer node info is invalid");
      return;
    }

    const req: OpenChannelRequest = {
      node_id: peerNodePubkey.trim(),
      address: peerNodeAddress.trim(),
      channel_amount_sats: channelAmountSats.trim(),
      announce: announce === "1",
      push_to_counterparty_msat: null,
      rgb: null,
    };
    console.log("Open Channel Data:", req);
    openMutation.mutate({ nodeId: activeNodeId, request: req });
  };

  const setMax = () => {
    if(BigInt(btcBalance.current) > 0n) {
      setChannelAmountSats(btcBalance.current);
    }
  }

  return (
    <>
      <div className="mt-8 space-y-8">
        <Field>
          <FieldLabel>Increase Receiving Capacity</FieldLabel>
          <ComplexInput
            className="bg-background-4"
            inputMode="numeric"
            subfix={
              <div className="absolute z-50 top-4 right-4">
                <span className="mr-3">sats</span>
                <Button
                  variant="destructive"
                  className="h-7 rounded-full px-2.5 py-0 text-xs"
                  onClick={setMax}
                >MAX</Button>
              </div>
            }
            bottom={
              <span className="text-xs text-secondary-foreground">
                <span>Available: </span>
                <WalletBtcBalance
                  nodeId={activeNodeId ?? ""}
                  onBalanceLoad={(v) => {
                    btcBalance.current = v
                  }}
                />
              </span>
            }
            placeholder="0"
            value={channelAmountSats}
            onChange={(e) => setChannelAmountSats(e.currentTarget.value)}
          />
        </Field>

        <Field>
          <FieldLabel>Choose Channel Peer</FieldLabel>
          <Select onValueChange={selectLocalPeer}>
            <SelectTrigger className="bg-background-4">
              <SelectValue placeholder="Select Peer" />
            </SelectTrigger>
            <SelectContent>
              {peerList.map((v) => {
                return (
                  <SelectItem key={v.node_id} value={v.node_id}>
                    pubkey: {formatAddress(v.node_id)}
                  </SelectItem>
                );
              })}
              {
                peerList.length === 0 ? (
                  <EmptyNodes />
                ) : null
              }
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel className="flex items-center gap-2">
            <span>Public Channel</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hover:text-foreground">
                  <IconHelp />
                </div>
              </TooltipTrigger>
              <TooltipContent className="w-[254px]">
                <p>
                  Allows other nodes to discover this channel and route payments through it.
                  Enable this option if the channel will be used to forward payments between nodes.
                </p>
              </TooltipContent>
            </Tooltip>
          </FieldLabel>
          <Select value={announce} onValueChange={setAnnounce}>
            <SelectTrigger className="bg-background-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No</SelectItem>
              <SelectItem value="1">Yes</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Button
          type="button"
          variant="white"
          className="w-full rounded-full"
          size="lg"
          disabled={!channelAmountSats || !peerNodePubkey || !peerNodeAddress}
          onClick={preview}
        >
          Review
        </Button>
      </div>

      {/* Review  */}
      <Dialog open={review} onOpenChange={() => setReview(false)}>
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
          <div className="bg-background-3 rounded-2xl p-4">
            <div className="h-[18px] text-sm text-secondary-foreground flex justify-between">
              <div>Channel Capacity</div>
              <div>
                <span>Available: </span>
                <WalletBtcBalance
                  nodeId={activeNodeId ?? ""}
                />
              </div>
            </div>
            <div className="text-[17px] mt-1 font-medium">
              {channelAmountSats} sats
            </div>
          </div>
          <div className="bg-background-3 rounded-2xl p-4">
            <div className="h-5 text-base flex justify-between items-center">
              <div className="text-secondary-foreground">Funding Source</div>
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
              onClick={() => {
                setReview(false)
                openMutation.reset()
              }}
            >
              Cancel
            </Button>
            <Button
              variant="white"
              size="lg"
              type="button"
              className="flex-1 rounded-full"
              disabled={openMutation.isPending}
              loading={openMutation.isPending}
              onClick={submitOpen}
            >
              Open Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function RGBForm(props: {peers: PeerDetailsDto[]}) {
  const [review, setReview] = useState(false);
  const [channelAmountSats, setChannelAmountSats] = useState("")
  const [peerNodePubkey, setPeerNodePubkey] = useState("");
  const [peerNodeAddress, setPeerNodeAddress] = useState("");
  const [announce, setAnnounce] = useState("0");
  const [rgbAssetAmount, setRgbAssetAmount] = useState("");
  const [selectedContract, setSelectedContract] = useState<RgbContractDto | null>(null);
  const rgbUtxoBalance = useRef("0");

  const currentContext = useContextStore((s) => s.currentContext);
  const nav = useNavigate();
  const activeNodeId = currentContext?.node_id;
  const peerList = props.peers;

  const rgbContractsQuery = useNodeRgbContractsQuery(activeNodeId, {
    refetchInterval: false,
  });

  const selectLocalPeer = async (pubKey: string) => {
    console.log("Selected peer:", pubKey);

    const selectedNode = peerList.find((c) => c.node_id === pubKey);
    setPeerNodePubkey(pubKey);
    setPeerNodeAddress(selectedNode?.address ?? "");
  };

  const check = () => {
    // check input
    if(BigInt(channelAmountSats || "0") < BigInt(MIN_RGB_CHANNEL_SATS)) {
      toast.error(`The minimum amount is ${MIN_RGB_CHANNEL_SATS} sats. Please increase the channel capacity and try again.`)
      return
    }

    // Check balance
    if(BigInt(channelAmountSats) >= BigInt(rgbUtxoBalance.current)) {
      toast.error("Insufficient receiving capacity.")
      return
    }

    setReview(true);
  }

  const openMutation = useChannelOpenMutation({
    onSuccess: () => {
      nav(-1);
    },
  });

  const submitOpen = () => {
    if (!activeNodeId) {
      toast.error("No active node selected");
      return;
    }

    if (!peerNodeAddress || !peerNodePubkey) {
      toast.error("Peer node info is invalid");
      return;
    }

    if(!selectedContract) {
      toast.error("No RGB contract selected");
      return;
    }

    const precision = selectedContract.precision ?? 0;
    const req: OpenChannelRequest = {
      node_id: peerNodePubkey.trim(),
      address: peerNodeAddress.trim(),
      channel_amount_sats: channelAmountSats.trim(),
      announce: announce === "1",
      push_to_counterparty_msat: null,
      rgb: {
        contract_id: selectedContract.contract_id,
        asset_amount: BigInt(
          Number(rgbAssetAmount.trim()) * 10 ** precision
        ).toString(),
        color_context_data: defaultRgbContextData(currentContext),
      }
    };
    console.log("Open Channel Data:", req);
    openMutation.mutate({ nodeId: activeNodeId, request: req });
  };

  return (
    <>
      <div className="mt-8">
        <Field>
          <FieldLabel>
            Transfer RGB Assets Into the Channel
          </FieldLabel>
          <AssetSelect
            contracts={rgbContractsQuery.data?.contracts ?? []}
            selectedContractId={selectedContract?.contract_id ?? ""}
            onChange={setSelectedContract}
          />
        </Field>
        <Field className="mt-3">
          <ComplexInput
            className="bg-background-4"
            inputMode="numeric"
            subfix={
              <div className="absolute z-50 top-4 right-4">
                <span>{selectedContract?.name}</span>
              </div>
            }
            bottom={
              <div className="text-xs text-secondary-foreground flex gap-1">
                <span>Available:</span>
                <AssetBalance
                  nodeId={activeNodeId ?? ""}
                  contractId={selectedContract?.contract_id ?? ""}
                  precision={selectedContract?.precision ?? 0}
                />
                <span>{selectedContract?.name}</span>
              </div>
            }
            placeholder="0"
            value={rgbAssetAmount}
            onChange={(e) => setRgbAssetAmount(e.currentTarget.value)}
          />
        </Field>
        <Field className="mt-8">
          <FieldLabel>Increase Receiving Capacity</FieldLabel>
          <ComplexInput
            className="bg-background-4"
            inputMode="numeric"
            subfix={
              <div className="absolute z-50 top-4 right-4">
                <span>sats</span>
              </div>
            }
            bottom={
              <span className="text-xs text-secondary-foreground">
                <span>Available: </span>
                <RgbUtxoBalance
                  nodeId={activeNodeId ?? ""}
                  contractId={selectedContract?.contract_id ?? ""}
                  onBalance={(sats) => {
                    rgbUtxoBalance.current = sats
                  }}
                />
              </span>
            }
            placeholder="0"
            value={channelAmountSats}
            onChange={(e) => setChannelAmountSats(e.currentTarget.value)}
          />
        </Field>

        <Field className="mt-8">
          <FieldLabel>Choose Channel Peer</FieldLabel>
          <Select
            onValueChange={selectLocalPeer}
          >
            <SelectTrigger className="bg-background-4">
              <SelectValue placeholder="Select Peer" />
            </SelectTrigger>
            <SelectContent>
              {peerList.map((v) => {
                return (
                  <SelectItem key={v.node_id} value={v.node_id}>
                    Pubkey: {formatAddress(v.node_id)}
                  </SelectItem>
                );
              })}
              {
                peerList.length === 0 ? (
                  <EmptyNodes />
                ) : null
              }
            </SelectContent>
          </Select>
        </Field>

        <Field className="mt-8">
          <FieldLabel>Public Channel</FieldLabel>
          <Select value={announce} onValueChange={setAnnounce}>
            <SelectTrigger className="bg-background-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No</SelectItem>
              <SelectItem value="1">Yes</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Button
          type="button"
          variant="white"
          className="mt-8 w-full rounded-full"
          size="lg"
          disabled={!channelAmountSats || !peerNodePubkey || !peerNodeAddress}
          onClick={check}
        >
          Review
        </Button>
      </div>

      {/* Review  */}
      <Dialog open={review} onOpenChange={() => setReview(false)}>
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
          <div className="bg-background-3 rounded-2xl p-4">
            <div className="h-[18px] text-sm text-secondary-foreground flex justify-between">
              <div>Channel Capacity</div>
              <div>
                <span>Available: </span>
                <RgbUtxoBalance
                  nodeId={activeNodeId ?? ""}
                  contractId={selectedContract?.contract_id ?? ""}
                  onBalance={(sats) => {
                    rgbUtxoBalance.current = sats
                  }}
                />
              </div>
            </div>
            <div className="text-[17px] mt-1 font-medium">
              {channelAmountSats} sats
            </div>
             {selectedContract ? (
              <>
                <div className="h-[1px] bg-background-3 my-4"></div>
                <div className="h-[18px] text-sm text-secondary-foreground">
                  Initial RGB Deposit
                </div>
                <div className="text-[17px] mt-1 font-medium">
                  {rgbAssetAmount} {selectedContract?.name}
                </div>
              </>
            ) : null}
          </div>
          <div className="bg-background-3 rounded-2xl p-4">
            <div className="h-5 text-base flex justify-between items-center">
              <div className="text-secondary-foreground">Funding Source</div>
              <div>RGB Asset UTXO</div>
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
              onClick={() => {
                setReview(false)
                openMutation.reset()
              }}
            >
              Cancel
            </Button>
            <Button
              variant="white"
              size="lg"
              type="button"
              className="flex-1 rounded-full"
              disabled={openMutation.isPending}
              loading={openMutation.isPending}
              onClick={submitOpen}
            >
              Open Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
