import AssetAvatar from "@/app/components/AssetAvatar";
import CopyText from "@/app/components/CopyText";
import IconBtc from "@/app/icons/btc";
import IconRadio from "@/app/icons/radio";
import IconRadioChecked from "@/app/icons/radio-checked";
import IconTriangleDown, { IconTriangleUp } from "@/app/icons/triangle";
import { useChannelCloseMutation } from "@/app/mutations/channels";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { errorToText } from "@/lib/errorToText";
import { formatNumber } from "@/lib/number";
import type { ChannelDetailsExtendedDto, RgbContractDto } from "@/lib/sdk/types";
import { formatAddress } from "@/lib/utils";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface IProps {
  onClose: () => void;
  onSuccess: () => void;
  contracts: RgbContractDto[] | undefined;
  selectedChannel: ChannelDetailsExtendedDto | null;
}
export default function CloseDialog(props: IProps) {
  const { contracts, selectedChannel } = props;
  const [posting, setPosting] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"close" | "force">("close");
  const currentContext = useContextStore((s) => s.currentContext);

  const activeNodeId = currentContext?.node_id;

  const closeChannelMutation = useChannelCloseMutation()

  const selectedChannelBalance = useMemo(() => {
    if (!selectedChannel) return null;

    const list = contracts ?? [];
    const local = selectedChannel.rgb_balance?.local_amount ?? '0'
    const remote = selectedChannel.rgb_balance?.remote_amount ?? '0';
    const contractId = selectedChannel.rgb_balance?.contract_id ?? '';

    const contract = list.find((c) => c.contract_id === contractId);
    const precision = contract?.precision ?? 0;

    if(!contract) return null;

    return {
      localAmount: formatNumber(local, precision),
      remoteAmount: formatNumber(remote, precision),
      contractId,
      precision,
      name: contract?.name ?? '',
    };

  }, [contracts, selectedChannel]);

  const closeChannel = async () => {
    if (!activeNodeId || !selectedChannel || !confirmAction) return;

    try {
      setPosting(true);
      await closeChannelMutation.mutateAsync({
        nodeId: activeNodeId,
        request: {
          user_channel_id: selectedChannel.user_channel_id,
          counterparty_node_id: selectedChannel.counterparty_node_id,
        },
        force: confirmAction === "force",
      });

      // Delay a bit to allow the backend to process the channel closure before refetching
      await new Promise((resolve) => setTimeout(resolve, 1000));
      props.onClose();
      props.onSuccess();

    } catch(e) {
      toast.error(errorToText(e))
    } finally {
      setPosting(false);
    }
  }

  return (
    <Dialog
      open={true}
      onOpenChange={props.onClose}
    >
      <DialogContent className="w-[560px]">
        <DialogHeader>
          <DialogTitle>Are you sure you want to close the channel?</DialogTitle>
        </DialogHeader>
        <div>
          <label className="text-base font-medium">Closing this channel will settle all assets on-chain</label>
          <div>
            <div className="mt-3 bg-background-2 rounded-2xl p-4">
              <div className="flex gap-3">
                <IconBtc width={22} height={22} />
                <div>
                  <div className="text-lg font-medium">
                    {
                      selectedChannel?.local_balance_msat ? (
                        (BigInt(selectedChannel.local_balance_msat) / 1000n).toString()
                      ) : (
                        (BigInt(selectedChannel?.outbound_capacity_msat ?? 0) / 1000n).toString()
                      )
                    } sats
                  </div>
                  <div className="mt-1 text-xs text-secondary-foreground">
                    Receiving capacity will decrease by {
                      selectedChannel?.local_balance_msat ? (
                        (BigInt(selectedChannel.local_balance_msat) / 1000n).toString()
                      ) : (
                        (BigInt(selectedChannel?.outbound_capacity_msat ?? 0) / 1000n).toString()
                      )
                    } sats
                  </div>
                </div>
              </div>
              {
                selectedChannelBalance ? (
                  <>
                    <Separator className="my-4" />
                    <div className="flex gap-3">
                      <AssetAvatar className="w-[22px] h-[22px]" name={selectedChannelBalance.name} />
                      <div>
                        <div className="text-lg font-medium">
                          <span>{selectedChannelBalance.localAmount}</span>
                          <span> {selectedChannelBalance.name}</span>
                        </div>
                        <div className="mt-1 text-xs text-secondary-foreground h-[18px] flex items-center">
                          <span>Local: {selectedChannelBalance.localAmount} {selectedChannelBalance.name}</span>
                          <Separator orientation="vertical" className="mx-3 h-[12px] bg-secondary-foreground" />
                          <span>Remote: {selectedChannelBalance.remoteAmount} {selectedChannelBalance.name}</span>
                        </div>
                        <div className="mt-3 flex">
                          <div className="text-xs text-secondary-foreground h-6 py-1 px-3 rounded-full bg-background-2 flex items-center gap-2">
                            <span>{formatAddress(selectedChannelBalance.contractId)}</span>
                            <CopyText
                              text={selectedChannelBalance.contractId}
                              className="text-secondary-foreground"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null
              }
            </div>
            <div className="mt-3 text-sm text-secondary-foreground">
              Ensure your on-chain wallet has sufficient UTXOs to receive RGB assets.
            </div>
          </div>
        </div>
        <div>
          <label className="text-base font-medium">Closure Strategy</label>
          <div className="mt-3 flex flex-col gap-3">
            <Button
              variant="destructive"
              className="h-19 px-4 py-4 justify-start rounded-2xl"
              onClick={() => setConfirmAction('close')}
            >
              <span className="self-start">
                {confirmAction === 'close' ? <IconRadioChecked /> : <IconRadio />}
              </span>
              <div className="text-left">
                <span className="text-lg font-medium">Normal Close</span>
                <div className="mt-1 text-sm text-secondary-foreground">Fast and cheap. Both nodes must be online.</div>
              </div>
            </Button>
            <Button
              variant="destructive"
              className="h-19 px-4 py-4 justify-start rounded-2xl"
              onClick={() => setConfirmAction('force')}
            >
              <span className="self-start">
                {confirmAction === 'force' ? <IconRadioChecked /> : <IconRadio />}
              </span>
              <div className="text-left">
                <span className="text-lg font-medium">Force Close</span>
                <div className="mt-1 text-sm text-secondary-foreground">Slow and expensive. Use only if peer is offline.</div>
              </div>
            </Button>
          </div>
        </div>
        <div>
          <div
            className="h-5 flex items-center cursor-pointer text-base font-medium"
            onClick={() => setShowDetail(!showDetail)}
          >
            {
              showDetail ? (
                <IconTriangleUp />
              ) : (
                <IconTriangleDown />
              )
            }
            <span>Technical Details</span>
          </div>
          {
            showDetail ? (
              <div className="bg-background-2 mt-3 p-4 rounded-2xl space-y-4">
                <div>
                  <label className="text-base">Node ID</label>
                  <div className="text-base text-secondary-foreground">{selectedChannel?.counterparty_node_id}</div>
                </div>
                <div>
                  <label className="text-base">Channel ID</label>
                  <div className="text-base text-secondary-foreground">{selectedChannel?.user_channel_id}</div>
                </div>
              </div>
            ) : null
          }
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            type="button"
            size="lg"
            className="rounded-full flex-1"
            onClick={props.onClose}
          >
            Cancel
          </Button>
          <Button
            variant="white"
            type="button"
            size="lg"
            className="rounded-full flex-1"
            disabled={
              posting ||
              !contracts ||
              !selectedChannel
            }
            loading={posting}
            onClick={closeChannel}
          >
            {confirmAction === "force" ? "Force Close" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
