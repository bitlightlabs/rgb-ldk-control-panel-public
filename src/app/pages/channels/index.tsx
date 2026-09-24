import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useNodeMainChannelsClosingQuery,
  useNodeMainChannelsQuery,
  useNodeRgbContractsQuery,
} from "@/app/queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import IconDelete from "@/app/icons/delete";
import { CopyTextInline } from "@/app/components/CopyText";
import { Content } from "@/app/components/ContentWrapper";
import Empty from "@/app/components/Empty";
import IconPlus from "@/app/icons/IconPlus";
import PageHeader from "@/app/components/PageHeader";
import { useContextStore } from "@/app/stores/contextStore";
import IconRefresh from "@/app/icons/refresh";
import { formatNumber } from "@/lib/number";
import DropMenu from "@/app/components/DropMenu";
import { ChannelClosing, ChannelDetailsExtendedDto } from "@/lib/sdk/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CloseDialog from "./CloseDialog";
import IconBuy from "@/app/icons/buy";
import IconSettings from "@/app/icons/settings";


export default function ChannelsPage() {
  const nav = useNavigate()
  const [loading, setLoading] = useState<boolean>(false);
  const [tab, setTab] = useState<string>('Channels');
  const [selectedChannel, setSelectedChannel] = useState<ChannelDetailsExtendedDto | null>(null);

  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  const channelsQuery = useNodeMainChannelsQuery(activeNodeId, {
    enabled: false,
  });
  const channelsClosingQuery = useNodeMainChannelsClosingQuery(activeNodeId, {
    enabled: false,
  });

  const rgbContractsQuery = useNodeRgbContractsQuery(activeNodeId, {
    enabled: false,
  });

  const refreshList = () => {
    let t = setTimeout(() => {
      setLoading(false);
      clearTimeout(t);
    }, 2000);

    setLoading(true);
    if(tab === 'Channels') {
      channelsQuery.refetch()
    } else {
      channelsClosingQuery.refetch()
    }
  }

  useEffect(() => {
    if(!activeNodeId) return;
    rgbContractsQuery.refetch();
    channelsQuery.refetch();
  }, [activeNodeId])


  const pickChannel = (id: string) => {
    const list = channelsQuery.data ?? []
    const channel = list.find((c) => c.user_channel_id === id) ?? null;
    setSelectedChannel(channel);
  }

  const formatRgbBalance = (balance: any, contractId: string) => {
    const list = rgbContractsQuery.data?.contracts ?? [];
    const contract = list.find((c) => c.contract_id === contractId);
    if (!contract) return '--';

    return formatNumber(balance, contract.precision ?? 0) + ' ' + contract.name;
  }

  const renderChannelsList = (list: ChannelDetailsExtendedDto[]) => {
    if(list.length === 0) {
      return (
        <div className="h-[586px] flex-1 flex justify-center items-center">
          <Empty
            title="No Channels Found"
            subTitle="You don't have any open channels yet. Create a channel to start using Lightning Network."
            action={
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full"
                onClick={() => nav('/dashboard/channels/open')}
              >
                <IconPlus style={{width: '20px', height: '20px'}} />
                <span>Open Channel</span>
              </Button>
            }
          />
        </div>
      )
    }

    return (
      <Table style={{minWidth: 'max-content'}}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>NODE / TYPE</TableHead>
            <TableHead>STATUS</TableHead>
            <TableHead>CAPACITY</TableHead>
            <TableHead>OUTBOUND / BALANCE</TableHead>
            <TableHead>RGB LOCAL / RGB REMOTE</TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((v) => {
              return (
                <TableRow
                  key={v.user_channel_id}
                  className="h-14 cursor-pointer"
                  onClick={() => nav('/dashboard/channels/detail?id=' + v.user_channel_id)}
                >
                  <TableCell>
                    <div>
                      <CopyTextInline
                        length={12}
                        text={v.user_channel_id}
                        buttonClassName="text-secondary-foreground"
                      />
                      <div className="mt-1">
                        {v.rgb_balance
                          ? <Badge variant="secondary">BTC/RGB</Badge>
                          : <Badge variant="secondary">BTC</Badge>
                        }
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {v.is_channel_ready
                      ? <Badge variant="success">READY</Badge>
                      : <Badge variant="destructive">PENDING</Badge>}
                  </TableCell>
                  <TableCell>{v.channel_value_sats} sats</TableCell>
                  <TableCell>
                    <div>{formatNumber(v.outbound_capacity_msat, 3)} sats</div>
                    <div>{formatNumber(v.local_balance_msat ?? 0, 3)} sats</div>
                  </TableCell>
                  <TableCell>
                    {
                      v.rgb_balance ? (
                        <div>
                          <div>{formatRgbBalance(v.rgb_balance.local_amount, v.rgb_balance.contract_id)}</div>
                          <div>{formatRgbBalance(v.rgb_balance.remote_amount, v.rgb_balance.contract_id)}</div>
                        </div>
                      ) : (
                        <span>--</span>
                      )
                    }
                  </TableCell>
                  <TableCell>
                    <DropMenu
                      direaction="horizontal"
                      variant="ghost"
                      list={[
                        {
                          disabled: !v.is_channel_ready,
                          label: <span className="text-error">Close Channel</span>,
                          icon: <IconDelete className="text-error" />,
                          data: v.user_channel_id,
                          onClick: (id: string) => {
                            console.log("close channel", id)
                            pickChannel(id)
                          }
                        }
                      ]}
                    />
                  </TableCell>
                </TableRow>
              )
            })
          }
        </TableBody>
      </Table>
    )
  }
  const renderSettlingList = (list: ChannelClosing[]) => {
    if(list.length === 0) {
      return (
        <div className="h-[586px] flex flex-col justify-center items-center">
          <div className="text-base leading-5">No Channels Settling</div>
          <div className="mt-2 leading-[18px] text-xs text-secondary-foreground">There are currently no channels being settled.</div>
        </div>
      )
    }

    return (
      <Table style={{minWidth: 'max-content'}}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>NODE / TYPE</TableHead>
            <TableHead>STATUS</TableHead>
            <TableHead>BTC BALANCE</TableHead>
            <TableHead>RGB LOCAL / RGB REMOTE</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((v) => {
              return (
                <TableRow
                  key={v.channel_id}
                  className="h-14 cursor-pointer"
                >
                  <TableCell>
                    <div>
                      <CopyTextInline
                        length={12}
                        text={v.channel_id}
                        buttonClassName="text-secondary-foreground"
                      />
                      <div className="mt-1">
                        {v.rgb
                          ? <Badge variant="secondary">BTC/RGB</Badge>
                          : <Badge variant="secondary">BTC</Badge>
                        }
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">{v.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {v.btc_balances
                      ? v.btc_balances.reduce((acc, curr) => acc + BigInt(curr.amount_sats), 0n)
                      : '--'} sats
                  </TableCell>
                  <TableCell>
                    {
                      v.rgb ? (
                        <div>
                          <div>{formatRgbBalance(v.rgb.local_amount, v.rgb.contract_id)}</div>
                          <div>{formatRgbBalance(v.rgb.remote_amount, v.rgb.contract_id)}</div>
                          {
                            v.rgb.sweep_status === 'parked' ? (
                              <Badge variant="destructive">Wallet balance is insufficient. Please top up</Badge>
                            ) : null
                          }
                        </div>
                      ) : (
                        <span>--</span>
                      )
                    }
                    <div></div>
                  </TableCell>
                </TableRow>
              )
            })
          }
        </TableBody>
      </Table>
    )
  }

  const renderList = () => {
    const list = channelsQuery.data ?? []
    const closingList = channelsClosingQuery.data ?? []

    return (
      <Content className="mt-0 px-2 py-3">
        {renderTabs()}
        <div className="mt-3">
          {
            tab === 'Channels' ? renderChannelsList(list) : renderSettlingList(closingList)
          }
        </div>
      </Content>
    )
  }

  const changeTab = (value: string) => {
    setTab(value);
    if(value === 'Channels') {
      channelsQuery.refetch();
    } else if(value === 'Settling') {
      channelsClosingQuery.refetch()
    }
  }

  const renderTabs = () => {
    return (
      <div className="flex">
        <Tabs value={tab} onValueChange={changeTab}>
          <TabsList className="h-10 flex items-center justify-start w-auto rounded-full bg-background gap-1">
            <TabsTrigger
              className="h-8 px-4 rounded-full text-base"
              value="Channels"
            >
              Channels
            </TabsTrigger>
            <TabsTrigger
              className="h-8 px-4 rounded-full text-base"
              value="Settling"
            >
              Settling
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    )
  }

  const lspSettings = () => {
    if(currentContext?.is_lsp) {
      // LSP side
      nav('/dashboard/channels/lsp-settings')
    } else {
      // User side
      nav('/dashboard/channels/lsp-connect')
    }
  }

  if (!activeNodeId) {
    return null
  }

  return (
    <>
      <PageHeader
        title="Channels"
        action={
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="rounded-full"
              size="icon"
              disabled={loading || channelsQuery.isPending}
              onClick={refreshList}
            >
              <IconRefresh
                width={16}
                height={16}
                className={
                  loading || channelsQuery.isPending ? "animate-spin" : ""
                }
              />
            </Button>
            <Button
              variant="destructive"
              className="w-[150px] rounded-full"
              onClick={lspSettings}
            >
              <IconSettings style={{width: '20px', height: '20px'}} />
              <span>LSP Settings</span>
            </Button>
            {
              currentContext?.is_lsp ? null : (
                <Button
                  variant="destructive"
                  className="w-[150px] rounded-full"
                  onClick={() => nav('/dashboard/channels/buy')}
                >
                  <IconBuy style={{width: '20px', height: '20px'}} />
                  <span>Buy Channel</span>
                </Button>
              )
            }
            <Button
              variant="white"
              className="w-[150px] rounded-full"
              onClick={() => nav('/dashboard/channels/open')}
            >
              <IconPlus style={{width: '20px', height: '20px'}} />
              <span>Open Channel</span>
            </Button>
          </div>
        }
      />

      {/* Channel detail */}
      {renderList()}

      {/* Close channel dialog */}
      {selectedChannel !== null ? (
        <CloseDialog
          onClose={() => setSelectedChannel(null)}
          onSuccess={() => channelsQuery.refetch()}
          contracts={rgbContractsQuery.data?.contracts}
          selectedChannel={selectedChannel}
        />
      ) : null}
    </>
  );
}
