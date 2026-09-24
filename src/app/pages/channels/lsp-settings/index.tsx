import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { useLspOptionsUpdateMutation, useUpdateCurrentLspPricingMutation } from "@/app/mutations/lsp";
import { useLspOptionsQuery, useNodeCurrentLspOrdersQuery, useNodeCurrentLspPricing } from "@/app/queries/lsp";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList } from "@/components/ui/tabs";
import { errorToText } from "@/lib/errorToText";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import TabsCustomerTrigger from "../buy-channel/components/TabTrigger";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Empty from "@/app/components/Empty";
import IconPlus from "@/app/icons/IconPlus";
import type { LspOptions, LspOrderItem, LspPricing } from "@/lib/sdk/types";
import AddDialog from "./components/AddDialog";
import { formatNumber } from "@/lib/number";
import { formatAddress } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useNodeRgbContractsQuery } from "@/app/queries/rgb";
import type { RgbContractDto } from "@/lib/sdk/types";
import AssetAvatar from "@/app/components/AssetAvatar";
import { CopyTextInline } from "@/app/components/CopyText";
import { BITCOIN_MONTH_BLOCKS } from "@/app/config/constant";

export default function LspSettingsPage() {
  const nav = useNavigate()
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;
  const [type, setType] = useState<'Base Settings' | 'Channel Settings' | 'Asset Settings' | 'Orders'>("Base Settings");

  const rgbContractsQuery = useNodeRgbContractsQuery(activeNodeId, {
    enabled: !!activeNodeId
  });
  const contracts = rgbContractsQuery.data?.contracts || [];

  return (
    <ContentWrapper className="mb-10 w-full">
      <ContentHeader title="LSP Settings" onBack={() => nav(-1)} />
      <Content>
        <form className="space-y-8">
          <Tabs value={type} onValueChange={setType as any}>
            <TabsList className="h-10 px-1 py-1 inline-flex bg-background gap-1 rounded-full">
              <TabsCustomerTrigger page="Base Settings" />
              <TabsCustomerTrigger page="Channel Settings" />
              <TabsCustomerTrigger page="Asset Settings" />
              <TabsCustomerTrigger page="Orders" />
            </TabsList>
          </Tabs>

          {
            type === "Base Settings"
            ? <BaseSettingsForm />
            : (type === 'Channel Settings'
                ? <ChannelSettingsForm />
                : (type === 'Asset Settings'
                    ? <AssetSettingsForm />
                    : <Orders contracts={contracts} />
                  )
              )
          }
        </form>
      </Content>
    </ContentWrapper>
  )
}

function BaseSettingsForm() {
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;
  const [oldData, setOldData] = useState<LspPricing | null>(null);

  const [defaultBtcCapacityPpmPerYear, setDefaultBtcCapacityPpmPerYear] = useState<string>("");
  const [defaultOnchainCostSat, setDefaultOnchainCostSat] = useState<string>("");
  const [defaultMinFeeSat, setDefaultMinFeeSat] = useState<string>("");

  const updateMutation = useUpdateCurrentLspPricingMutation();
  const pricingQuery = useNodeCurrentLspPricing(activeNodeId, {
    enabled: false
  });

  const initForm = async () => {
    if(!activeNodeId) return;
    try {
      const pricing = await pricingQuery.refetch();
      if(pricing.data) {
        setOldData(pricing.data);
        const price = pricing.data.pricing;

        setDefaultBtcCapacityPpmPerYear(BigInt(price.btc_capacity_ppm_per_year || 0).toString());
        setDefaultOnchainCostSat(price.onchain_cost_sat);
        setDefaultMinFeeSat(price.min_fee_sat);
      }
    } catch(e) {
      toast.error(errorToText(e));
    }
  }

  useEffect(() => {
    initForm();
  }, [activeNodeId])

  const update = async () => {
    if(!activeNodeId) return;

    const payload = {
      assets: oldData?.assets || [],
      pricing: {
        btc_capacity_ppm_per_year: Number(defaultBtcCapacityPpmPerYear),
        onchain_cost_sat: defaultOnchainCostSat,
        min_fee_sat: defaultMinFeeSat,
      },
    };

    try {
      await updateMutation.mutateAsync({
        nodeId: activeNodeId,
        request: payload,
      });

      toast.success("Updated successfully");
    } catch(e) {
      toast.error(errorToText(e))
    }
  }

  return (
    <>
      <Field>
        <FieldLabel>Default BTC Capacity PPM Per Year</FieldLabel>
        <Input
          className="bg-background-4"
          placeholder="100000"
          value={defaultBtcCapacityPpmPerYear}
          onChange={(e) => setDefaultBtcCapacityPpmPerYear(e.currentTarget.value)}
        />
      </Field>
      <Field>
        <FieldLabel>Default Onchain Cost Sat</FieldLabel>
        <Input
          className="bg-background-4"
          placeholder="100000"
          value={defaultOnchainCostSat}
          onChange={(e) => setDefaultOnchainCostSat(e.currentTarget.value)}
        />
      </Field>
      <Field>
        <FieldLabel>Default Min Fee Sat</FieldLabel>
        <Input
          className="bg-background-4"
          placeholder="100000"
          value={defaultMinFeeSat}
          onChange={(e) => setDefaultMinFeeSat(e.currentTarget.value)}
        />
      </Field>

      <Button
        type="button"
        size="lg"
        variant="white"
        className="w-full rounded-full"
        disabled={!defaultBtcCapacityPpmPerYear
          || !defaultOnchainCostSat
          || !defaultMinFeeSat
          || updateMutation.isPending
        }
        onClick={update}
      >Save</Button>
    </>
  )
}

function ChannelSettingsForm() {
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;
  const [oldData, setOldData] = useState<LspOptions | null>(null);

  const [min_channel_balance_sat, setMinChannelBalanceSat] = useState<string>("");
  const [max_channel_balance_sat, setMaxChannelBalanceSat] = useState<string>("");
  const [min_initial_lsp_balance_sat, setMinInitialLspBalanceSat] = useState<string>("");
  const [max_initial_lsp_balance_sat, setMaxInitialLspBalanceSat] = useState<string>("");
  const [min_initial_client_balance_sat, setMinInitialClientBalanceSat] = useState<string>("");
  const [max_initial_client_balance_sat, setMaxInitialClientBalanceSat] = useState<string>("");
  const [leaseMonths, setLeaseMonths] = useState<string>("");

  const updateMutation = useLspOptionsUpdateMutation();
  const optionsQuery = useLspOptionsQuery(activeNodeId, {
    enabled: false
  });

  const initForm = async () => {
    if(!activeNodeId) return;
    try {
      const res = await optionsQuery.refetch();
      if(res.data) {
        const options = res.data.supported_options;
        const rentMonths = BigInt(options.max_channel_expiry_blocks || 0) / BigInt(BITCOIN_MONTH_BLOCKS);

        setOldData(res.data);
        setMinChannelBalanceSat(options.min_channel_balance_sat);
        setMaxChannelBalanceSat(options.max_channel_balance_sat);
        setMinInitialLspBalanceSat(options.min_initial_lsp_balance_sat);
        setMaxInitialLspBalanceSat(options.max_initial_lsp_balance_sat);
        setMinInitialClientBalanceSat(options.min_initial_client_balance_sat);
        setMaxInitialClientBalanceSat(options.max_initial_client_balance_sat);
        setLeaseMonths(rentMonths.toString())
      }
    } catch(e) {
      toast.error(errorToText(e));
    }
  }

  useEffect(() => {
    initForm();
  }, [activeNodeId])

  const update = async () => {
    if(!activeNodeId || !oldData) return;

    if(BigInt(min_channel_balance_sat) > BigInt(max_channel_balance_sat)) {
      toast.error("Invalid channel balance settings");
      return;
    }
    if(BigInt(min_initial_lsp_balance_sat) > BigInt(max_initial_lsp_balance_sat)) {
      toast.error("Invalid initial LSP balance settings");
      return;
    }
    if(BigInt(min_initial_client_balance_sat) > BigInt(max_initial_client_balance_sat)) {
      toast.error("Invalid initial client balance settings");
      return;
    }

    const expiryBlocks = (BigInt(leaseMonths) * BigInt(BITCOIN_MONTH_BLOCKS)).toString();
    const payload = {
      "service": oldData.service,
      "supported_options": {
          "max_channel_balance_sat": max_channel_balance_sat,
          "max_channel_expiry_blocks": Number(expiryBlocks),
          "max_initial_client_balance_sat": max_initial_client_balance_sat,
          "max_initial_lsp_balance_sat": max_initial_lsp_balance_sat,
          "min_channel_balance_sat": min_channel_balance_sat,
          "min_funding_confirms_within_blocks": 6,
          "min_initial_client_balance_sat": min_initial_client_balance_sat,
          "min_initial_lsp_balance_sat": min_initial_lsp_balance_sat,
          "min_required_channel_confirmations": 0,
          "supports_zero_channel_reserve": false
      }
    };

    try {
      await updateMutation.mutateAsync({
        nodeId: activeNodeId,
        request: payload,
      });

      toast.success("Updated successfully");
    } catch(e) {
      toast.error(errorToText(e))
    }
  }

  const changeMinChannelBalance = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.currentTarget.value;
    setMinChannelBalanceSat(v);

    // if(min_initial_lsp_balance_sat) {
    //   const minClient = BigInt(v) - BigInt(min_initial_lsp_balance_sat);
    //   setMinInitialClientBalanceSat(minClient.toString());
    // }
  }
  const changeMaxChannelBalance = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.currentTarget.value;
    setMaxChannelBalanceSat(v);

    // if(max_initial_lsp_balance_sat) {
    //   const maxClient = BigInt(v) - BigInt(max_initial_lsp_balance_sat);
    //   setMaxInitialClientBalanceSat(maxClient.toString());
    // }
  }

  const changeMinInitialLspBalance = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.currentTarget.value;
    setMinInitialLspBalanceSat(v);

    // if(min_channel_balance_sat) {
    //   const minClient = BigInt(min_channel_balance_sat) - BigInt(v);
    //   setMinInitialClientBalanceSat(minClient.toString());
    // }
  }
  const changeMaxInitialLspBalance = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.currentTarget.value;
    setMaxInitialLspBalanceSat(v);

    // if(max_channel_balance_sat) {
    //   const maxClient = BigInt(max_channel_balance_sat) - BigInt(v);
    //   setMaxInitialClientBalanceSat(maxClient.toString());
    // }
  }

  return (
    <>
      <Field>
        <FieldLabel>Maximum Lease Term</FieldLabel>
        <Input
          className="bg-background-4"
          placeholder="1"
          value={leaseMonths}
          onChange={(e) => setLeaseMonths(e.currentTarget.value)}
          slot={<span>months</span>}
        />
      </Field>
      <div className="flex gap-5">
        <Field>
          <FieldLabel>Min Channel Balance Sat</FieldLabel>
          <Input
            className="bg-background-4"
            placeholder="100000"
            value={min_channel_balance_sat}
            onChange={changeMinChannelBalance}
          />
        </Field>
        <Field>
          <FieldLabel>Max Channel Balance Sat</FieldLabel>
          <Input
            className="bg-background-4"
            placeholder="10000000"
            value={max_channel_balance_sat}
            onChange={changeMaxChannelBalance}
          />
        </Field>
      </div>
      <div className="flex gap-5">
        <Field>
          <FieldLabel>Min Initial Lsp Balance Sat</FieldLabel>
          <Input
            className="bg-background-4"
            placeholder="100000"
            value={min_initial_lsp_balance_sat}
            onChange={changeMinInitialLspBalance}
          />
        </Field>
        <Field>
          <FieldLabel>Max Initial Lsp Balance Sat</FieldLabel>
          <Input
            className="bg-background-4"
            placeholder="10000000"
            value={max_initial_lsp_balance_sat}
            onChange={changeMaxInitialLspBalance}
          />
        </Field>
      </div>
      <div className="flex gap-5">
        <Field>
          <FieldLabel>Min Initial Client Balance Sat</FieldLabel>
          <Input
            className="bg-background-4"
            placeholder="0"
            value={min_initial_client_balance_sat}
            onChange={(e) => setMinInitialClientBalanceSat(e.currentTarget.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Max Initial Client Balance Sat</FieldLabel>
          <Input
            className="bg-background-4"
            placeholder="0"
            value={max_initial_client_balance_sat}
            onChange={(e) => setMaxInitialClientBalanceSat(e.currentTarget.value)}
          />
        </Field>
      </div>

      <Button
        type="button"
        size="lg"
        variant="white"
        className="w-full rounded-full"
        disabled={
          updateMutation.isPending
          || !min_initial_lsp_balance_sat
          || !max_initial_lsp_balance_sat
          || !min_channel_balance_sat
          || !max_channel_balance_sat
        }
        onClick={update}
      >Save</Button>
    </>
  )
}

function AssetSettingsForm() {
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LspPricing | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<string>("");

  const pricingQuery = useNodeCurrentLspPricing(activeNodeId, {
    enabled: false
  });

  const initForm = async () => {
    if(!activeNodeId) return;
    try {
      setLoading(true);
      const pricing = await pricingQuery.refetch();
      if(pricing.data) {
        setData(pricing.data);
      }
    } catch(e) {
      toast.error(errorToText(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    initForm();
  }, [activeNodeId])

  const add = () => {
    setShowDialog(true);
  }


  const renderContent = () => {
    const list = data?.assets || [];

    if(!loading && list.length === 0) {
      return (
        <div className="h-[200px] flex items-center justify-center">
          <Empty
            title="No assets"
            subTitle="There are no assets available."
            action={
              <Button
                type="button"
                size="lg"
                variant="destructive"
                className="rounded-full"
                onClick={add}
              >
                <IconPlus style={{width: '20px', height: '20px'}} />
                <span>Add Asset</span>
              </Button>
            }
          />
        </div>
      )
    }

    return (
      <>
        <Table style={{minWidth: 'max-content'}}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>ASSET</TableHead>
              <TableHead>UNIT PRICE SAT</TableHead>
              <TableHead>RENT PPM PER YEAR</TableHead>
              <TableHead>MIN LSP ASSET BALANCE</TableHead>
              <TableHead>MAX LSP ASSET BALANCE</TableHead>
              {/* <TableHead>MAX CLIENT ASSET BALANCE</TableHead> */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((v) => {
                return (
                  <TableRow
                    key={v.asset_id}
                    className="h-14 cursor-pointer"
                    onClick={() => {
                      setEditingAssetId(v.asset_id);
                      setShowDialog(true);
                    }}
                  >
                    <TableCell>
                      {v.ticker}
                    </TableCell>
                    <TableCell>
                      {v.asset_unit_price_sat}
                    </TableCell>
                    <TableCell>
                      {v.asset_rent_ppm_per_year}
                    </TableCell>
                    <TableCell>
                      {formatNumber(v.min_lsp_asset_balance, v.precision)}
                    </TableCell>
                    <TableCell>
                      {formatNumber(v.max_lsp_asset_balance, v.precision)}
                    </TableCell>
                    {/* <TableCell>
                      {v.max_client_asset_balance}
                    </TableCell> */}
                  </TableRow>
                )
            })}
          </TableBody>
        </Table>

        <Button
          type="button"
          size="lg"
          variant="destructive"
          className="w-full rounded-full"
          onClick={add}
        >Add Asset</Button>
      </>
    )
  }

  return (
    <>
      {renderContent()}

      {
        showDialog && data !== null ? (
          <AddDialog
            data={data}
            editingAssetId={editingAssetId}
            onClose={() => {
              setShowDialog(false)
              setEditingAssetId("");
            }}
            onSuccess={() => initForm()}
          />
        ) : null
      }
    </>
  )
}

function Orders({contracts}: {contracts: RgbContractDto[]}) {
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  // const detail = async (orderId: string) => {
  //   if(!activeNodeId) return;
  //   const res = await nodeCurrentLspOrdersDetail(activeNodeId, orderId);
  //   console.log("order detail", res)
  // }

  const ordersQuery = useNodeCurrentLspOrdersQuery(activeNodeId, {
    enabled: !!activeNodeId
  });

  // const data = ordersQuery.data || [];
  const list = ordersQuery.data?.orders || [];

  const renderAsset = (rgb: LspOrderItem['rgb']) => {
    const find = contracts.find((c) => c.contract_id === rgb.asset_id);
    if(!find) return null;

    const precision = find.precision ?? 0;
    return (
      <div>
        <div >
          <AssetAvatar className="w-5 h-5" name={find.ticker ?? ''} />
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span>{formatNumber(rgb.lsp_asset_balance, precision)}</span>
          <span>{find.ticker}</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <Table style={{minWidth: 'max-content'}}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>TYPE</TableHead>
            <TableHead>STATUS</TableHead>
            <TableHead>BUYER</TableHead>
            <TableHead>CHANNEL CAPACITY</TableHead>
            <TableHead>CLIENT BALANCE</TableHead>
            <TableHead>LSP BALANCE</TableHead>
            <TableHead>ASSET</TableHead>
            <TableHead>ORDER TOTAL</TableHead>
            <TableHead>PAY ONCHAIN ADDRESS</TableHead>
            <TableHead>PAYMENT STATUS</TableHead>
            <TableHead>TIME</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((v) => {
              return (
                <TableRow
                  key={v.order_id}
                  className="h-14 cursor-pointer"
                >
                  <TableCell>
                    {v.rgb ? 'BTC/RGB' : 'BTC'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={v.order_state.toUpperCase() === 'COMPLETED' ? 'success' : 'secondary'}
                    >{v.order_state}</Badge>
                  </TableCell>
                  <TableCell>
                    {formatAddress(v.counterparty_node_id, 12)}
                  </TableCell>
                  <TableCell>
                    {BigInt(v.client_balance_sat) + BigInt(v.lsp_balance_sat)} sat
                  </TableCell>
                  <TableCell>
                    {v.client_balance_sat} sat
                  </TableCell>
                  <TableCell>
                    {v.lsp_balance_sat} sat
                  </TableCell>
                  <TableCell>
                    {
                      !v.rgb ? '-' : renderAsset(v.rgb)
                    }
                  </TableCell>
                  <TableCell>
                    {v.order_total_sat} sat
                  </TableCell>
                  <TableCell>
                    <CopyTextInline
                      text={v.onchain_address}
                    />
                  </TableCell>
                  <TableCell>
                    {v.payment_state}
                  </TableCell>
                  <TableCell>
                    {new Date(Number(v.created_at_unix_secs) * 1000).toLocaleString()}
                  </TableCell>
                </TableRow>
              )
          })}
        </TableBody>
      </Table>
    </>
  )
}
