import {
  ActionHeader,
  Content,
  ContentWrapper,
} from "@/app/components/ContentWrapper";
import CreateUtxoDialog from "@/app/components/CreateUtxoDialog";
import Empty from "@/app/components/Empty";
import UtxoItem from "@/app/components/UtxoItem";
import IconPlus from "@/app/icons/IconPlus";
import IconRefresh from "@/app/icons/refresh";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useRgbSyncMutation } from "@/app/mutations";
import { useNodeRgbContractsQuery, useNodeRgbUtxosQuery } from "@/app/queries";
import type { RgbUtxoDto } from "@/lib/sdk/generated-types";
import { type JSX, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function UtxoPage() {
  const nav = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);
  const [loading, setLoading] = useState(true);
  const [showCreateUtxo, setShowCreateUtxo] = useState(false);
  const [utxoList, setUtxoList] = useState<RgbUtxoDto[] | null>(null);

  const activeNodeId = currentContext?.node_id;

  const rgbUtxosQuery = useNodeRgbUtxosQuery(activeNodeId);

  const loadUtxos = async () => {
    const data = await rgbUtxosQuery.refetch();
    setUtxoList(data.data?.utxos ?? []);
  };

  useEffect(() => {
    setLoading(rgbUtxosQuery.isLoading);
    setUtxoList(rgbUtxosQuery.data?.utxos ?? null);
  }, [rgbUtxosQuery.data?.utxos, rgbUtxosQuery.isLoading]);

  const rgbContractsQuery = useNodeRgbContractsQuery(activeNodeId);

  const syncRgbMutation = useRgbSyncMutation({
    onSuccess: async () => {
      if (!currentContext) return;
      await Promise.all([rgbContractsQuery.refetch(), loadUtxos()]);
    },
  });

  const renderCreateUtxoDialog = () => {
    if (!showCreateUtxo) {
      return null;
    }

    return (
      <CreateUtxoDialog
        onClose={() => setShowCreateUtxo(false)}
      />
    );
  };

  const contracts = rgbContractsQuery.data
    ? rgbContractsQuery.data.contracts
    : [];
  const left: JSX.Element[] = [];
  const right: JSX.Element[] = [];
  if (utxoList) {
    utxoList.forEach((utxo, i) => {
      if (i % 2 === 0) {
        left.push(
          <UtxoItem
            key={utxo.outpoint}
            utxo={utxo}
            contracts={contracts}
            onRefreshUtxoList={() => loadUtxos()}
          />
        );
      } else {
        right.push(
          <UtxoItem
            key={utxo.outpoint}
            utxo={utxo}
            contracts={contracts}
            onRefreshUtxoList={() => loadUtxos()}
          />
        );
      }
    });
  }

  if (loading) {
    return (
      <div className="w-full flex justify-center items-center h-[400px]">
        <Spinner className="w-7 h-7" />
      </div>
    );
  }

  if (!utxoList || utxoList.length === 0) {
    return (
      <ContentWrapper className="w-full">
        <ActionHeader title="UTXO Management" onBack={() => nav("/dashboard")}>
          <div className="flex items-center gap-3">
            <Button
              variant="destructive"
              className="rounded-full"
              disabled={syncRgbMutation.isPending}
              onClick={() => activeNodeId && syncRgbMutation.mutate(activeNodeId)}
            >
              <IconRefresh
                width={16}
                height={16}
                className={
                  syncRgbMutation.isPending ? "animate-spin" : undefined
                }
              />
              <span>Sync RGB</span>
            </Button>
            <Button
              variant="white"
              className="w-[150px] rounded-full"
              onClick={() => setShowCreateUtxo(true)}
            >
              <IconPlus style={{ width: "20px", height: "20px" }} />
              <span>Create UTXO</span>
            </Button>
          </div>
        </ActionHeader>
        <Content className="mt-4 h-[622px] flex justify-center items-center">
          <Empty
            title="No UTXOs Found"
            subTitle="Create an RGB-compatible UTXO to anchor your assets and start transacting."
            action={
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full"
                onClick={() => setShowCreateUtxo(true)}
              >
                <IconPlus style={{ width: "20px", height: "20px" }} />
                <span>Create UTXO</span>
              </Button>
            }
          />
        </Content>

        {renderCreateUtxoDialog()}
      </ContentWrapper>
    );
  }

  return (
    <>
      <ContentWrapper className="w-full">
        <ActionHeader title="UTXO Management" onBack={() => nav("/dashboard")}>
          <div className="flex items-center gap-3">
            <Button
              variant="destructive"
              className="rounded-full"
              disabled={syncRgbMutation.isPending}
              onClick={() => activeNodeId && syncRgbMutation.mutate(activeNodeId)}
            >
              <IconRefresh
                width={16}
                height={16}
                className={
                  syncRgbMutation.isPending ? "animate-spin" : undefined
                }
              />
              <span>Sync RGB</span>
            </Button>
            <Button
              variant="white"
              className="w-[150px] rounded-full"
              onClick={() => setShowCreateUtxo(true)}
            >
              <IconPlus style={{ width: "20px", height: "20px" }} />
              <span>Create UTXO</span>
            </Button>
          </div>
        </ActionHeader>
        <div className="mt-4 flex justify-between gap-3">
          <div data-role="left" className="flex-1 space-y-3">
            {left}
          </div>
          <div data-role="right" className="flex-1">
            {right}
          </div>
        </div>
      </ContentWrapper>

      {/* Create UTXO */}
      {renderCreateUtxoDialog()}
    </>
  );
}
