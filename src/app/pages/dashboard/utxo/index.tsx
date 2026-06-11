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
import { nodeRgbContracts, nodeRgbSync, nodeRgbUtxos } from "@/lib/commands";
import type { RgbUtxoDto } from "@/lib/sdk/generated-types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type JSX, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function UtxoPage() {
  const nav = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);
  const [loading, setLoading] = useState(true);
  const [showCreateUtxo, setShowCreateUtxo] = useState(false);
  const [utxoList, setUtxoList] = useState<RgbUtxoDto[] | null>(null);

  const loadUtxos = async (force = false) => {
    if (!currentContext) return;

    try {
      setLoading(true);
      const data = await nodeRgbUtxos(currentContext.node_id, force);
      setUtxoList(data.utxos);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUtxos();
  }, [currentContext]);

  const rgbContractsQuery = useQuery({
    queryKey: ["dashboard_rgb_contracts", currentContext?.node_id],
    queryFn: async () => {
      return nodeRgbContracts(currentContext!.node_id);
    },
    enabled: !!currentContext?.node_id,
  });

  const syncRgbMutation = useMutation({
    mutationFn: async () => nodeRgbSync(currentContext!.node_id),
    onSuccess: async () => {
      if (!currentContext) return;
      await Promise.all([rgbContractsQuery.refetch(), loadUtxos(true)]);
    },
  });

  const renderCreateUtxoDialog = () => {
    if (!showCreateUtxo) {
      return null;
    }

    return (
      <CreateUtxoDialog
        onClose={() => setShowCreateUtxo(false)}
        onRefreshUtxoList={() => loadUtxos()}
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
            onRefreshUtxoList={() => loadUtxos(true)}
          />
        );
      } else {
        right.push(
          <UtxoItem
            key={utxo.outpoint}
            utxo={utxo}
            contracts={contracts}
            onRefreshUtxoList={() => loadUtxos(true)}
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
              onClick={() => syncRgbMutation.mutate()}
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
        <Content className="mt-4 h-[630px] flex justify-center items-center">
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
              onClick={() => syncRgbMutation.mutate()}
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
