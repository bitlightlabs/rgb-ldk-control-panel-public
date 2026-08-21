import { type JSX, useState } from "react";
import {
  ActionHeader,
  Content,
  ContentWrapper,
} from "@/app/components/ContentWrapper";
import CreateUtxoDialog from "@/app/components/CreateUtxoDialog";
import Empty from "@/app/components/Empty";
import UtxoItem from "./components/UtxoItem";
import IconPlus from "@/app/icons/IconPlus";
import IconRefresh from "@/app/icons/refresh";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useRgbSyncMutation } from "@/app/mutations";
import { useNodeRgbContractsQuery, useNodeRgbUtxosQuery, useRgbUtxosMergeStatusQuery } from "@/app/queries";
import { useNavigate } from "react-router-dom";
import MergeAssetDialog from "./components/MergeAssetDialog";

export default function UtxoPage() {
  const nav = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);
  const [showCreateUtxo, setShowCreateUtxo] = useState(false);
  const [showMergeAsset, setShowMergeAsset] = useState(false);
  const activeNodeId = currentContext?.node_id;

  const rgbUtxosQuery = useNodeRgbUtxosQuery(activeNodeId);
  const rgbUtxosMergeStatusQuery = useRgbUtxosMergeStatusQuery(activeNodeId)

  const utxoList = rgbUtxosQuery.data?.utxos ?? [];
  const rgbUtxosMergeStatusData = rgbUtxosMergeStatusQuery.data;

  const reLoadUtxos = async () => {
    rgbUtxosQuery.refetch();
  };

  const rgbContractsQuery = useNodeRgbContractsQuery(activeNodeId);
  const syncRgbMutation = useRgbSyncMutation({
    onSuccess: async () => {
      if (!currentContext) return;
      await Promise.all([rgbUtxosMergeStatusQuery.refetch(), reLoadUtxos()]);
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

  const renderMergeAssetDialog = () => {
    if (!showMergeAsset) {
      return null;
    }

    return (
      <MergeAssetDialog
        onClose={(refresh) => {
          setShowMergeAsset(false);
          if(refresh && activeNodeId) {
            syncRgbMutation.mutate(activeNodeId);
          }
        }}
      />
    );
  }

  const isLoading = rgbUtxosQuery.isFetching || syncRgbMutation.isPending
  const contracts = rgbContractsQuery.data?.contracts ?? [];
  const left: JSX.Element[] = [];
  const right: JSX.Element[] = [];
  utxoList.forEach((utxo, i) => {
    if (i % 2 === 0) {
      left.push(
        <UtxoItem
          key={utxo.outpoint}
          mergeStatusData={rgbUtxosMergeStatusData}
          utxo={utxo}
          contracts={contracts}
          onRefreshUtxoList={() => reLoadUtxos()}
        />
      );
    } else {
      right.push(
        <UtxoItem
          key={utxo.outpoint}
          mergeStatusData={rgbUtxosMergeStatusData}
          utxo={utxo}
          contracts={contracts}
          onRefreshUtxoList={() => reLoadUtxos()}
        />
      );
    }
  });

  return (
    <>
      <ContentWrapper className="w-full">
        <ActionHeader title="UTXO Management" onBack={() => nav("/dashboard")}>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="rounded-full"
              size="icon"
              disabled={isLoading}
              onClick={() => activeNodeId && syncRgbMutation.mutate(activeNodeId)}
            >
              <IconRefresh
                width={16}
                height={16}
                className={
                  isLoading ? "animate-spin" : undefined
                }
              />
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => setShowMergeAsset(true)}
            >
              Consolidate UTXOs
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

        {isLoading ? (
          <div className="w-full flex justify-center items-center h-[400px]">
            <Spinner className="w-7 h-7" />
          </div>
        ) : utxoList.length === 0 ? (
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
        ) : (
          <div className="mt-4 flex justify-between gap-3">
            <div data-role="left" className="flex-1 space-y-3">
              {left}
            </div>
            <div data-role="right" className="flex-1 space-y-3">
              {right}
            </div>
          </div>
        )}
      </ContentWrapper>

      {/* Create UTXO */}
      {renderCreateUtxoDialog()}
      {renderMergeAssetDialog()}
    </>
  );
}
