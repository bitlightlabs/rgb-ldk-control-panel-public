import { useMemo, useState } from "react";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import AssetSelect from "@/app/components/AssetSelect";
import type { RgbContractDto } from "@/lib/sdk";
import MergeAssetUtxoSelect from "./MergeAssetUtxoSelect";
import type { RgbUtxoDto } from "@/lib/sdk/generated-types";
import Row from "@/app/components/Row";
import { formatNumber } from "@/lib/number";
import Fee from "@/app/components/Fee";
import { useNodeRgbUtxosQuery } from "@/app/queries/rgb";
import { useContextStore } from "@/app/stores/contextStore";
import { useRgbUtxosMergeMutation } from "@/app/mutations";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";
import { calculateUtxosAssetSum, selectAssetUtxos } from "@/lib/utils";

interface IProps {
  onClose: (refresh: boolean) => void;
}
export default function MergeAssetDialog(props: IProps) {
  const [posting, setPosting] = useState(false);
  const [feeRate, setFeeRate] = useState("0");
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [selectedContract, setSelectedContract] = useState<RgbContractDto | null>(null);
  const [selectedUtxo, setSelectedUtxo] = useState<RgbUtxoDto | null>(null);
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  const mergeUtxosMutation = useRgbUtxosMergeMutation();
  const rgbUtxosQuery = useNodeRgbUtxosQuery(activeNodeId, true, {
    enabled: false
  });

  const postMergeUtxos = async () => {
    if(!selectedContract || !selectedUtxo) {
      return;
    }

    try {
      setPosting(true);
      await mergeUtxosMutation.mutateAsync({
        nodeId: activeNodeId ?? "",
        request: {
          contract_id: selectedContract.contract_id,
          destination_utxo: selectedUtxo.outpoint,
          include_invoice_bound_utxos: false,
          fee_rate_sats_per_vb: Number(feeRate)
        }
      })
      // Wait a moment for the merge to be processed before refreshing the UTXO list
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("UTXOs merged successfully");

      props.onClose(true)
    } catch(e) {
      toast.error(errorToText(e))
    } finally {
      setPosting(false);
    }
  }

  const filteredUtxoList = useMemo(() => {
    const list = rgbUtxosQuery.data?.utxos ?? []
    const assetUtxos = selectAssetUtxos(list, selectedContract?.contract_id ?? "")
    return assetUtxos;
  }, [rgbUtxosQuery.data?.utxos, selectedContract])

  const sum = calculateUtxosAssetSum(filteredUtxoList, selectedContract?.contract_id ?? "");

  const renderStep = () => {
    if(step === 'form') {
      return (
        <DialogContent className="w-[560px] px-5 py-5">
          <DialogHeader>
            <DialogTitle>Consolidate UTXOs</DialogTitle>
          </DialogHeader>

          <Field>
            <FieldLabel>RGB Asset</FieldLabel>
            <AssetSelect
              selectedContractId={selectedContract?.contract_id ?? ""}
              onChange={setSelectedContract}
            />
          </Field>
          <Field>
            <FieldLabel>Destination UTXO</FieldLabel>
            <MergeAssetUtxoSelect
              utxos={filteredUtxoList}
              contract={selectedContract}
              onChangeUtxos={setSelectedUtxo}
            />
          </Field>
          <Field>
            <FieldLabel>Fee</FieldLabel>
            <div>
              <Fee onFeeChange={setFeeRate} />
            </div>
          </Field>

          {
            sum.sats > 0n ? (
              <div>
                <div className="px-4 py-4 bg-background-3 rounded-3xl space-y-4">
                  <Row label="Selected UTXOs" value={filteredUtxoList.length} />
                  <Row
                    label="Total RGB Amount"
                    value={
                      formatNumber(
                        sum.assets.toString(),
                        selectedContract?.precision ?? 0
                      ) + ' ' + (selectedContract?.name ?? "")
                    }
                  />
                  <Row
                    label="Total BTC"
                    value={formatNumber(sum.sats.toString(), 8) + ' BTC'}
                  />
                  <Row
                    label="Transaction Fee Rate"
                    value={feeRate + ' sats/VB'}
                  />
                </div>
                <div className="mt-3 text-base text-secondary-foreground">
                  You can't make transactions during UTXO consolidation.
                  UTXOs with pending transactions can't be consolidated.
                </div>
              </div>
            ) : null
          }

          <DialogFooter>
            <Button
              variant="destructive"
              type="button"
              size="lg"
              className="rounded-full flex-1"
              onClick={() => props.onClose(false)}
            >
              Cancel
            </Button>
            <Button
              variant="white"
              type="button"
              size="lg"
              className="rounded-full flex-1"
              disabled={filteredUtxoList.length <= 1}
              onClick={() => setStep('confirm')}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      )
    }

    return (
      <DialogContent className="w-[400px] px-5 py-5">
        <DialogHeader>
          <DialogTitle>Confirm UTXO Consolidation</DialogTitle>
        </DialogHeader>
        <div className="text-base">
          Are you sure you want to consolidate these UTXOs?
          Once consolidation begins, it cannot be canceled or reversed.
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            type="button"
            size="lg"
            className="rounded-full flex-1"
            onClick={() => setStep('form')}
          >
            Cancel
          </Button>
          <Button
            variant="white"
            type="button"
            size="lg"
            className="rounded-full flex-1"
            disabled={!selectedUtxo || !selectedContract || posting}
            loading={posting}
            onClick={postMergeUtxos}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    )
  }

  return (
    <Dialog open onOpenChange={() => props.onClose(false)}>
      {renderStep()}
    </Dialog>
  )
}
