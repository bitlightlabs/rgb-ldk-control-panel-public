import AssetSelect from "@/app/components/AssetSelect";
import { useUpdateCurrentLspPricingMutation } from "@/app/mutations/lsp";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { errorToText } from "@/lib/errorToText";
import { formatNumber, parseNumber } from "@/lib/number";
import { LspPricing, LspPricingAsset, RgbContractDto } from "@/lib/sdk/types";
import { defaultRgbContextData } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface IProps {
  data: LspPricing
  editingAssetId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddDialog(props: IProps) {
  const { data } = props;
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  const [selectedContract, setSelectedContract] = useState<Pick<RgbContractDto, 'contract_id' | 'ticker' | 'precision'> | null>(null);
  const [asset_unit_price_sat, setAssetUnitPriceSat] = useState<string>("");
  const [asset_rent_ppm_per_year, setAssetRentPpmPerYear] = useState<string>("");
  const [min_lsp_asset_balance, setMinLspAssetBalance] = useState<string>("");
  const [max_lsp_asset_balance, setMaxLspAssetBalance] = useState<string>("");
  // const [max_client_asset_balance, setMaxClientAssetBalance] = useState<string>("0");

  const updateMutation = useUpdateCurrentLspPricingMutation();

  const create = async (info: LspPricingAsset) => {
    if(!data) {
      return
    }

    const find = data.assets.find((v) => v.asset_id === info.asset_id);
    if(find) {
      toast.error("Asset already exists");
      return
    }

    const newAssets = [...data.assets, info];
    const price = data.pricing;
    const payload = {
      pricing: {
        btc_capacity_ppm_per_year: price.btc_capacity_ppm_per_year || 0,
        onchain_cost_sat: price.onchain_cost_sat || '0',
        min_fee_sat: price.min_fee_sat || '0',
      },
      assets: newAssets,
    }

    try {
      await updateMutation.mutateAsync({
        nodeId: activeNodeId,
        request: payload,
      });

      toast.success("Add successfully");
      props.onClose();
      props.onSuccess();
    } catch(e) {
      toast.error(errorToText(e))
    }
  }
  const edit = async (info: LspPricingAsset) => {
    if(!data) {
      return
    }

    const find = data.assets.find((v) => v.asset_id === info.asset_id);
    if(!find) {
      toast.error("Asset does not exist");
      return
    }

    const newAssets = data.assets.map((v) => v.asset_id === find.asset_id ? info : v);
    const price = data.pricing;
    const payload = {
      pricing: {
        btc_capacity_ppm_per_year: price.btc_capacity_ppm_per_year || 0,
        onchain_cost_sat: price.onchain_cost_sat || '0',
        min_fee_sat: price.min_fee_sat || '0',
      },
      // min_initial_lsp_balance_sat: data.min_initial_lsp_balance_sat || 0,
      // max_initial_lsp_balance_sat: data.max_initial_lsp_balance_sat || 0,
      // min_channel_balance_sat: data.min_channel_balance_sat || 0,
      // max_channel_balance_sat: data.max_channel_balance_sat || 0,

      assets: newAssets,
    }

    try {
      await updateMutation.mutateAsync({
        nodeId: activeNodeId,
        request: payload,
      });

      toast.success("Update successfully");
      props.onClose();
      props.onSuccess();
    } catch(e) {
      toast.error(errorToText(e))
    }
  }

  const addOrEdit = () => {
    if(!selectedContract) {
      return
    }

    const precision = selectedContract.precision ?? 0;
    const info = {
      asset_id: selectedContract.contract_id,
      ticker: selectedContract.ticker ?? '',
      precision: Number(selectedContract.precision),
      asset_unit_price_sat: asset_unit_price_sat,
      asset_rent_ppm_per_year: Number(asset_rent_ppm_per_year),
      min_lsp_asset_balance: parseNumber(min_lsp_asset_balance, precision),
      max_lsp_asset_balance: parseNumber(max_lsp_asset_balance, precision),
      max_client_asset_balance: "0", // can not edit for now
      "color_context": defaultRgbContextData(currentContext),
    }

    if(props.editingAssetId) {
      edit(info)
    } else {
      create(info)
    }
  }

  const initEdit = () => {
    if(!props.editingAssetId) {
      return
    }

    const find = data.assets.find((v) => v.asset_id === props.editingAssetId);
    if(!find) {
      return
    }

    const precision = find.precision ?? 0
    setSelectedContract({
      contract_id: find.asset_id,
      ticker: find.ticker,
      precision: precision,
    });
    setAssetUnitPriceSat(BigInt(find.asset_unit_price_sat).toString());
    setAssetRentPpmPerYear(BigInt(find.asset_rent_ppm_per_year).toString());
    setMinLspAssetBalance(formatNumber(find.min_lsp_asset_balance, precision));
    setMaxLspAssetBalance(formatNumber(find.max_lsp_asset_balance, precision));
    // setMaxClientAssetBalance(formatNumber(find.max_client_asset_balance, precision));
  }

  useEffect(() => {
    initEdit()
  }, [])

  return (
    <Dialog open onOpenChange={props.onClose}>
      <DialogContent className="w-[560px]">
        <DialogHeader>
          <DialogTitle>Add Asset</DialogTitle>
        </DialogHeader>

        <Field>
          <FieldLabel>Asset</FieldLabel>
          <AssetSelect
            selectedContractId={selectedContract?.contract_id ?? ""}
            onChange={setSelectedContract}
          />
        </Field>
        <Field>
          <FieldLabel>Asset Unit Price Sat</FieldLabel>
          <Input
            className="bg-background-4"
            placeholder="2000"
            value={asset_unit_price_sat}
            onChange={(e) => setAssetUnitPriceSat(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Asset rent ppm per year</FieldLabel>
          <Input
            className="bg-background-4"
            placeholder="40000"
            value={asset_rent_ppm_per_year}
            onChange={(e) => setAssetRentPpmPerYear(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Min lsp asset balance</FieldLabel>
          <Input
            className="bg-background-4"
            placeholder="10"
            value={min_lsp_asset_balance}
            onChange={(e) => setMinLspAssetBalance(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Max lsp asset balance</FieldLabel>
          <Input
            className="bg-background-4"
            placeholder="1000"
            value={max_lsp_asset_balance}
            onChange={(e) => setMaxLspAssetBalance(e.target.value)}
          />
        </Field>
        {/* <Field>
          <FieldLabel>Max client asset balance</FieldLabel>
          <Input
            className="bg-background-4"
            placeholder="0"
            value={max_client_asset_balance}
            onChange={(e) => setMaxClientAssetBalance(e.target.value)}
          />
        </Field> */}

        <div className="flex items-center gap-3">
          <Button
            variant="destructive"
            size="lg"
            className="w-full rounded-full"
            onClick={props.onClose}
          >Cancel</Button>

          <Button
            variant="white"
            size="lg"
            className="w-full rounded-full"
            disabled={!selectedContract
              || !asset_unit_price_sat
              || !asset_rent_ppm_per_year
              || !min_lsp_asset_balance
              || !max_lsp_asset_balance
              // || !max_client_asset_balance
            }
            loading={updateMutation.isPending}
            onClick={addOrEdit}
          >Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
