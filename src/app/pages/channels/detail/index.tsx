import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { useNodeMainChannelsQuery } from "@/app/queries/node";
import { useNodeRgbContractsQuery } from "@/app/queries/rgb";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import type { ChannelDetailsExtendedDto } from "@/lib/sdk/types";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CloseDialog from "../CloseDialog";
import { BITCOIN_MONTH_BLOCKS } from "@/app/config/constant";
import { Mountain } from "lucide-react";

type ChannelRgbBalance = {
  contractId: string;
  localAmount: string;
  remoteAmount: string;
};

function getChannelRgbBalance(channel: ChannelDetailsExtendedDto | null): ChannelRgbBalance | null {
  if (!channel) return null;
  const raw = channel.rgb_balance;
  if (!raw || typeof raw !== "object") return null;
  const rgb = raw as {
    contract_id?: unknown;
    local_amount?: unknown;
    remote_amount?: unknown;
  };
  const contractId = typeof rgb.contract_id === "string" ? rgb.contract_id.trim() : "";
  if (!contractId) return null;
  return {
    contractId,
    localAmount:
      rgb.local_amount == null ? "0" : String(rgb.local_amount).trim() || "0",
    remoteAmount:
      rgb.remote_amount == null ? "0" : String(rgb.remote_amount).trim() || "0",
  };
}

function getChannelTypeLabel(channel: ChannelDetailsExtendedDto | null): "BTC" | "BTC/RGB" {
  return getChannelRgbBalance(channel) ? "BTC/RGB" : "BTC";
}

export default function ChannelDetailPage() {
  const nav = useNavigate()
  const [search] = useSearchParams();
  const [showClose, setShowClose] = useState(false);
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  const channelsQuery = useNodeMainChannelsQuery(activeNodeId, {
    enabled: !!activeNodeId,
  });
  const rgbContractsQuery = useNodeRgbContractsQuery(activeNodeId, {
    enabled: !!activeNodeId,
  });

  const contracts = rgbContractsQuery.data?.contracts;
  const channelId = search.get("id") ?? "";

  const channel = useMemo(() => {
    const list = channelsQuery.data ?? [];
    return list.find(
      (c) => c.user_channel_id === channelId
    ) ?? null;
  }, [channelsQuery.data, channelId]);

  // Approximate expiry time
  const calculateExpiryTime = (channel: ChannelDetailsExtendedDto) => {
    if(!channel.lsp) {
      return '';
    }
    const monthMSecs = 1000 * 60 * 60 * 24 * 30;
    const month = (BigInt(channel.lsp.expires_at_height || 0)
      - (BigInt(channel.lsp.funded_at_height || 0)))
      / BigInt(BITCOIN_MONTH_BLOCKS);
    const createAt = Number(channel.lsp.created_at_unix_secs) * 1000;
    const expiryTime = new Date(monthMSecs * Number(month) + createAt);
    return expiryTime.toLocaleDateString();
  };

  return (
    <>
      <ContentWrapper className="w-full">
        <ContentHeader title="Channel Detail" onBack={() => nav(-1)} />

        <div className="mt-4 flex gap-3">
          <Content className="flex-1 mt-0">
            <h4 className="leading-[22px] text-lg font-medium">Channel Base Info</h4>
            <div className="mt-6 space-y-6">
              {
                channel?.lsp ? (
                  <div>
                    <label className="text-base text-secondary-foreground">LSP (Provider)</label>
                    <div className="mt-1 break-all text-base font-medium">
                      {channel.lsp.address}
                    </div>
                  </div>
                ) : null
              }
              <div>
                <label className="text-base text-secondary-foreground">Counterparty Node ID</label>
                <div className="mt-1 break-all text-base font-medium">
                  {channel?.counterparty_node_id}
                </div>
              </div>
              <div>
                <label className="text-base text-secondary-foreground">User Channel ID</label>
                <div className="mt-1 break-all text-base font-medium">
                  {channel?.user_channel_id}
                </div>
              </div>
              <div>
                <label className="text-base text-secondary-foreground">Channel Point</label>
                <div className="mt-1 break-all text-base font-medium">
                  {channel?.channel_point}
                </div>
              </div>

              {
                channel?.lsp ? (
                  <div>
                    <label className="text-base text-secondary-foreground">Channel Lease Term</label>
                    <div className="mt-1 break-all text-base font-medium">
                      {calculateExpiryTime(channel)}
                    </div>
                  </div>
                ) : null
              }
            </div>
          </Content>
          <Content className="flex-1 mt-0">
            <h4 className="leading-[22px] text-lg font-medium">Overflow</h4>
            <div className="mt-6 space-y-4 text-base">
              <div className="leading-5 flex items-center justify-between">
                <label className="text-base text-secondary-foreground">Asset Type</label>
                <span className="font-medium">
                  {getChannelTypeLabel(channel)}
                </span>
              </div>
              <div className="leading-5 flex items-center justify-between">
                <label className="text-base text-secondary-foreground">Channel Ready</label>
                <span className="font-medium">
                  {String(channel?.is_channel_ready)}
                </span>
              </div>
              <div className="leading-5 flex items-center justify-between">
                <label className="text-base text-secondary-foreground">Channel Usable</label>
                <span className="font-medium">
                  {String(channel?.is_usable)}
                </span>
              </div>
              <div className="leading-5 flex items-center justify-between">
                <label className="text-base text-secondary-foreground">Value</label>
                <span className="font-medium">
                  {channel?.channel_value_sats.toString()} sats
                </span>
              </div>
              <div className="leading-5 flex items-center justify-between">
                <label className="text-base text-secondary-foreground">Outbound Balance</label>
                <span className="font-medium">
                  {channel?.outbound_capacity_msat.toString()} msat
                </span>
              </div>
              <div className="leading-5 flex items-center justify-between">
                <label className="text-base text-secondary-foreground">Inbound Balance</label>
                <span className="font-medium ">
                  {channel?.inbound_capacity_msat.toString()} msat
                </span>
              </div>
              <div className="mt-6">
                <Button
                  variant="error"
                  size="lg"
                  className="rounded-full w-full bg-error/8"
                  onClick={() => setShowClose(true)}
                >Close Channel</Button>
              </div>
            </div>
          </Content>
        </div>

        <Content className="mt-3">
          <h4 className="leading-[22px] text-lg font-medium">Channel Base Info</h4>
          <div className="mt-6 h-[152px] overflow-auto">
            <pre className=" p-2 text-sm">
              {JSON.stringify(channel, null, 2)}
            </pre>
          </div>
        </Content>
      </ContentWrapper>

      {showClose ? (
        <CloseDialog
          contracts={contracts}
          selectedChannel={channel}
          onClose={() => setShowClose(false)}
          onSuccess={() => nav(-1)}
        />
      ) : null}
    </>
  )
}
