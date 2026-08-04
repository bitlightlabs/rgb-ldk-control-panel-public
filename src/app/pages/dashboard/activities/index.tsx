import { useNodePaymentsListQuery, useNodeRgbContractsQuery } from "@/app/queries";
import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { useNavigate } from "react-router-dom";
import { useContextStore } from "@/app/stores/contextStore";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { useNodeSwapListQuery } from "@/app/queries/swap";
import { ButtonDropMenu } from "@/app/components/DropMenu";
import { SwapList } from "./SwapList";
import { OnChainList } from "./OnchainList";

export default function ActivitiesPage() {
  const nav = useNavigate()
  const [filterType, setFilterType] = useState<string>('All Status');
  const [tab, setTab] = useState<string>('Swap');
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  const rgbContractsQuery = useNodeRgbContractsQuery(activeNodeId, {
    enabled: false
  });

  const useSwapListQuery = useNodeSwapListQuery(activeNodeId, {
    enabled: false
  });

  const paymentsQuery = useNodePaymentsListQuery(activeNodeId, {
    enabled: false
  });

  useEffect(() => {
    rgbContractsQuery.refetch();
    useSwapListQuery.refetch();
  }, [activeNodeId])

  const renderTabContent = (tab: string) => {
    if(tab === 'Swap') {
      const list = useSwapListQuery.data ?? [];
      const contracts = rgbContractsQuery.data?.contracts ?? [];
      return (
        <SwapList
          filterType={filterType}
          contracts={contracts}
          list={list}
          onRefresh={() => useSwapListQuery.refetch()}
        />
      )
    }

    if(tab === 'Onchain') {
      const list = paymentsQuery.data ?? [];
      return (
        <OnChainList loading={paymentsQuery.isFetching} list={list} />
      )
    }

    return null
  }

  const changeTab = (value: string) => {
    setTab(value);
    if(value === 'Swap') {
      useSwapListQuery.refetch();
    }

    if(value === 'Onchain') {
      paymentsQuery.refetch();
    }
  }

  return (
    <ContentWrapper className="w-full">
      <ContentHeader title="Activities" onBack={() => nav('/dashboard')} />
      <Content className="px-2 h-[618px] overflow-y-auto">
        <div className="px-3 flex justify-between">
          <Tabs value={tab} onValueChange={changeTab}>
            <TabsList className="h-10 flex items-center justify-start w-auto rounded-full bg-background gap-1">
              <TabsTrigger
                className="h-8 px-4 rounded-full text-base font-medium data-[state=active]:bg-background-2 hover:bg-background-2"
                value="Swap"
              >
                Swap
              </TabsTrigger>
              <TabsTrigger
                className="h-8 px-4 rounded-full text-base font-medium data-[state=active]:bg-background-2 hover:bg-background-2"
                value="Onchain"
              >
                On-chain
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {
            tab === 'Swap' ? (
              <div>
                <ButtonDropMenu
                  direaction="horizontal"
                  value={filterType}
                  list={[
                    {
                      label: "All Status",
                      icon: null,
                      data: 'All Status',
                      onClick: setFilterType
                    },
                    {
                      label: "Offered",
                      icon: null,
                      data: 'Offered',
                      onClick: setFilterType
                    },
                    {
                      label: "Accepted",
                      icon: null,
                      data: 'Accepted',
                      onClick: setFilterType
                    },
                    {
                      label: "Settled",
                      icon: null,
                      data: 'Settled',
                      onClick: setFilterType
                    },
                    {
                      label: "Failed",
                      icon: null,
                      data: 'Failed',
                      onClick: setFilterType
                    }
                  ]}
                />
              </div>
            ) : null
          }
        </div>

        <div className="mt-4">
          {renderTabContent(tab)}
        </div>
      </Content>
    </ContentWrapper>
  );
}




