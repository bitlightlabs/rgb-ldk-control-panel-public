import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import IconBack from "@/app/icons/back";
import IconRefresh from "@/app/icons/refresh";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useNavigate } from "react-router-dom";
import LSPSelect from "./components/LSPSelect";
import Row from "@/app/components/Row";
import { Tabs, TabsList } from "@/components/ui/tabs";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import SwitchButtons from "@/app/components/SwitchButtons";
import type { LspConnectionInfo, LspPricingAsset, LspQuoteData } from "@/lib/sdk/types";
import ConfirmDialog from "./components/ConfirmDialog";
import TabsCustomerTrigger from "./components/TabTrigger";
import { useNodeLspQuery, useNodeLspQuote } from "@/app/queries/lsp";
import { useContextStore } from "@/app/stores/contextStore";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";
import LspAssetSelect from "./components/LspAssetSelect";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import IconHelp from "@/app/icons/help";
import { calculateIntersection, formatNumber } from "@/lib/number";
import { BITCOIN_MONTH_BLOCKS, LSP_CLIENT_BALANCE_TIP } from "@/app/config/constant";
import { Checkbox } from "@/components/ui/checkbox";

export default function BuyChannelPage() {
  const nav = useNavigate()
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  const lspQuery = useNodeLspQuery(activeNodeId, {
    enabled: !!activeNodeId,
  });

  const loading = lspQuery.isFetching;
  const lspData = lspQuery.data;

  return (
    <ContentWrapper className="mb-10">
      <ContentHeader title="Buy Channel" onBack={() => nav(-1)} />
      {loading ? (<Loading />) : null}
      {!loading && !lspData ? (<Empty />) : <LSPForm />}
    </ContentWrapper>
  )
}

function LSPForm() {
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  const [showConfirm, setShowConfirm] = useState(false);
  const [lspQuoteData, setLspQuoteData] = useState<LspQuoteData | null>(null);
  const [selectedLsp, setSelectedLsp] = useState<LspConnectionInfo | null>(null);
  const [type, setType] = useState("BTC");
  const [channelCapacity, setChannelCapacity] = useState("");
  const [clientBalanceSat, setClientBalanceSat] = useState("");
  const [expiryBlocks, setExpiryBlocks] = useState(0);
  const [selectedContract, setSelectedContract] = useState<LspPricingAsset | null>(null);
  const [lspAssetBalance, setLspAssetBalance] = useState("");
  const [publicChannel, setPublicChannel] = useState(false);

  const [capacityError, setCapacityError] = useState<string>("");
  const [clientBalanceError, setClientBalanceError] = useState<string>("");
  const [rgbAmountError, setRgbAmountError] = useState<string>("");
  const [expiryList, setExpiryList] = useState<{label: string, value: string}[]>([]);

  const quoteQuery = useNodeLspQuote(activeNodeId, {
    enabled: false
  });

  const changeLsp = async (lsp: LspConnectionInfo) => {
    try {
      const res = await quoteQuery.refetch();
      if (res.data) {
        const expiryMonth = BigInt(res.data.supported_options.max_channel_expiry_blocks)
          / BigInt(BITCOIN_MONTH_BLOCKS);

        const list = []
        for(let i=0; i<expiryMonth && i<4n; i++) {
          list.push({label: `${i+1} month`, value: `${i+1}`});
        }
        setExpiryList(list);

        setLspQuoteData(res.data);
        setSelectedLsp(lsp);
      }
    } catch(e) {
      toast.error(errorToText(e));
    }
  }

  const changeExpiryBlocks = (value: string) => {
    const month = Number(value);
    setExpiryBlocks(month * BITCOIN_MONTH_BLOCKS);
  }

  const checkOrder = () => {
    // check expiry blocks
    const maxExpiryBlocks = lspQuoteData?.supported_options.max_channel_expiry_blocks ?? 0;
    if(expiryBlocks > maxExpiryBlocks) {
      toast.error('The channel lease term exceeds the limit: '
        + (BigInt(maxExpiryBlocks) / BigInt(BITCOIN_MONTH_BLOCKS)).toString());
      return;
    }

    // check channel capacity
    const maxCapacity = lspQuoteData?.supported_options.max_channel_balance_sat ?? '0';
    const minCapacity = lspQuoteData?.supported_options.min_channel_balance_sat ?? '0';
    if(BigInt(channelCapacity) > BigInt(maxCapacity)) {
      toast.error('The channel capacity exceeds the limit: ' + maxCapacity);
      return
    }
    if(BigInt(channelCapacity) < BigInt(minCapacity)) {
      toast.error('The channel capacity is below the minimum limit: ' + minCapacity);
      return
    }

    // check client balance
    const minClient = lspQuoteData?.supported_options.min_initial_client_balance_sat ?? '0';
    const maxClient = lspQuoteData?.supported_options.max_initial_client_balance_sat ?? '0';
    if(BigInt(clientBalanceSat) < BigInt(minClient)) {
      toast.error('The client balance is below the minimum limit: ' + minClient);
      return
    }
    if(BigInt(clientBalanceSat) > BigInt(maxClient)) {
      toast.error('The client balance exceeds the limit: ' + maxClient);
      return
    }

    // check lsp balance
    const minLsp = lspQuoteData?.supported_options.min_initial_lsp_balance_sat ?? '0';
    const maxLsp = lspQuoteData?.supported_options.max_initial_lsp_balance_sat ?? '0';
    const lspBalance = BigInt(channelCapacity) - BigInt(clientBalanceSat);
    if(lspBalance < BigInt(minLsp)) {
      toast.error('The LSP balance is below the minimum limit: ' + minLsp);
      return
    }
    if(lspBalance > BigInt(maxLsp)) {
      toast.error('The LSP balance exceeds the limit: ' + maxLsp);
      return
    }

    // check asset
    if(type === "BTC/RGB" && selectedContract) {
      const asset = lspQuoteData?.rgb.rgb_assets.find((a) => a.asset_id === selectedContract.asset_id);
      if(!asset) {
        return
      }

      const precision = asset.precision;
      const max = BigInt(asset.max_lsp_asset_balance) / BigInt(10 ** precision);
      const min = BigInt(asset.min_lsp_asset_balance) / BigInt(10 ** precision);
      const userInput = BigInt(lspAssetBalance);
      if(userInput > BigInt(max)) {
        toast.error('Asset amount exceeds the limit: ' + max);
        return
      }
      if(userInput < BigInt(min)) {
        toast.error('Asset amount is below the minimum limit: ' + min);
        return
      }
    }

    setShowConfirm(true);
  }

  const changeCapacity = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(!lspQuoteData) {
      return;
    }
    const v = e.target.value;
    if(isNaN(Number(v))) {
      return;
    }

    if(v !== '') {
      try {
        const min = lspQuoteData.supported_options.min_channel_balance_sat;
        const max = lspQuoteData.supported_options.max_channel_balance_sat;

        if(BigInt(v) < BigInt(min)) {
          setCapacityError('Channel capacity must fall within the range of ' + min + ' to ' + max);
        } else if(BigInt(v) > BigInt(max)) {
          setCapacityError('Channel capacity must fall within the range of ' + min + ' to ' + max);
        } else {
          setCapacityError('');
        }
      } catch(e) {}
    } else {
      setCapacityError('');
    }

    setChannelCapacity(v)
  }

  const clientRange = useMemo(() => {
    if(!channelCapacity || !lspQuoteData) {
      return null
    }

    // calculate client balance range
    const minLsp = lspQuoteData?.supported_options.min_initial_lsp_balance_sat ?? '0';
    const maxLsp = lspQuoteData?.supported_options.max_initial_lsp_balance_sat ?? '0';
    const minClient = lspQuoteData?.supported_options.min_initial_client_balance_sat ?? '0';
    const maxClient = lspQuoteData?.supported_options.max_initial_client_balance_sat ?? '0';
    const calcClientMin = channelCapacity ? BigInt(channelCapacity) - BigInt(maxLsp) : 0n;
    const calcClientMax = channelCapacity ? BigInt(channelCapacity) - BigInt(minLsp) : 0n;
    const clientRange = calculateIntersection(
      [calcClientMin, calcClientMax],
      [minClient, maxClient]
    );

    if(clientRange[0] <= 0n) {
      clientRange[0] = 0n;
    }
    if(clientRange[1] <= 0n) {
      clientRange[1] = 0n;
    }

    return clientRange;
  }, [lspQuoteData, channelCapacity]);

  const changeClientBalance = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if(isNaN(Number(v))) {
      return;
    }

    if(channelCapacity !== '') {
      if(clientRange) {
        if(BigInt(v) < clientRange[0] || BigInt(v) > clientRange[1]) {
          const range1 = clientRange[0];
          const range2 = clientRange[1];

          const msg = range1 === range2
            ? 'Client balance must be ' + range1
            : 'Client balance must fall within the range of ' + range1 + ' to ' + range2;
          setClientBalanceError(msg);
        } else {
          setClientBalanceError('');
        }
      }
    } else {
      setClientBalanceError('');
    }

    setClientBalanceSat(v)
  }

  const changeRgbAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const min = selectedContract?.min_lsp_asset_balance ?? '0';
    const max = selectedContract?.max_lsp_asset_balance ?? '0';
    const precision = selectedContract?.precision ?? 0;
    if(isNaN(Number(v))) {
      return;
    }

    if(v !== '') {
      try {
        const realMin = BigInt(min) / BigInt(10 ** precision);
        const realMax = BigInt(max) / BigInt(10 ** precision);
        const input = BigInt(v);

        if(input < BigInt(realMin) || input > BigInt(realMax)) {
          setRgbAmountError('Asset amount must fall within the range of ' + realMin + ' to ' + realMax);
        } else {
          setRgbAmountError('');
        }
      } catch(e) {}
    } else {
      setRgbAmountError('');
    }

    setLspAssetBalance(v);
  }

  return (
    <>
      <Content>
        <Field>
          <FieldLabel>LSP (Provider)</FieldLabel>
          <LSPSelect
            onChange={changeLsp}
          />
        </Field>
        {
          lspQuoteData !== null ? (
            <div className="mt-3 bg-background-3 rounded-3xl space-y-2 px-4 py-3">
              <Row
                className="text-xs text-secondary-foreground"
                label="Supported Assets"
                value={lspQuoteData.rgb.rgb_assets && lspQuoteData.rgb.rgb_assets.length > 0
                  ? 'BTC/RGB'
                  : 'BTC'
                }
              />
              <Row
                className="text-xs text-secondary-foreground"
                label="Channel Capacity"
                value={
                  lspQuoteData.supported_options.min_channel_balance_sat
                    + ' - ' + lspQuoteData.supported_options.max_channel_balance_sat + ' sats'
                }
              />
              <Row
                className="text-xs text-secondary-foreground"
                label="Maximum Lease Term"
                value={BigInt(lspQuoteData.supported_options.max_channel_expiry_blocks)
                  / BigInt(BITCOIN_MONTH_BLOCKS)+ ' months'
                }
              />
              <Row
                className="text-xs text-secondary-foreground"
                label="Minimum Fee"
                value={lspQuoteData.pricing.min_fee_sat + ' sats'}
              />
            </div>
          ) : null
        }
      </Content>
      <Content className="space-y-8">
        <Tabs value={type} onValueChange={setType}>
          <TabsList className="h-10 px-1 py-1 inline-flex bg-background gap-1 rounded-full">
            <TabsCustomerTrigger page="BTC" />
            <TabsCustomerTrigger page="BTC/RGB" />
          </TabsList>
        </Tabs>

        <Field data-invalid={capacityError !== ""}>
          <FieldLabel>Channel Capacity</FieldLabel>
          <Input
            placeholder={lspQuoteData === null
              ? "0"
              : `${lspQuoteData.supported_options.min_channel_balance_sat} - ${lspQuoteData.supported_options.max_channel_balance_sat}`
            }
            className="bg-background-4"
            slot={<span>sats</span>}
            value={channelCapacity}
            onChange={changeCapacity}
          />
          <FieldError>{capacityError}</FieldError>
        </Field>

        <Field data-invalid={clientBalanceError !== ""}>
          <FieldLabel>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-secondary-foreground">
                  <span>Client Balance</span>
                  <IconHelp />
                </div>
              </TooltipTrigger>
              <TooltipContent align="start" className="w-[250px]">
                <p>{LSP_CLIENT_BALANCE_TIP}</p>
              </TooltipContent>
            </Tooltip>
          </FieldLabel>
          <Input
            className="bg-background-4"
            placeholder={
              clientRange ? (
                clientRange[0] === clientRange[1]
                  ? clientRange[0].toString()
                  : `${clientRange[0]} - ${clientRange[1]}`
              ) : "0"
            }
            value={clientBalanceSat}
            onChange={changeClientBalance}
            slot={<span>sats</span>}
          />
          <FieldError>{clientBalanceError}</FieldError>
        </Field>

        {expiryList.length > 0 ? (
          <Field>
            <FieldLabel>Channel Lease Term</FieldLabel>
              <SwitchButtons
                list={expiryList}
                onChange={changeExpiryBlocks}
              />
          </Field>
        ) : null}

        {type === "BTC/RGB" ? (
            <Field>
              <FieldLabel>RGB Asset</FieldLabel>
              <LspAssetSelect
                contracts={lspQuoteData?.rgb?.rgb_assets ?? []}
                selectedAssetId={selectedContract?.asset_id ?? ""}
                onChange={(contract) => setSelectedContract(contract)}
              />
              <Input
                placeholder={selectedContract === null
                  ? "Amount"
                  : `Amount (${formatNumber(selectedContract.min_lsp_asset_balance, selectedContract.precision)} - ${formatNumber(selectedContract.max_lsp_asset_balance, selectedContract.precision)})`
                }
                className="bg-background-4"
                value={lspAssetBalance}
                onChange={changeRgbAmount}
              />
              <FieldError>{rgbAmountError}</FieldError>
            </Field>
          ) : null
        }

        <Field orientation="horizontal">
          <Checkbox
            id="public-channel"
            name="public-channel"
            checked={publicChannel}
            onCheckedChange={(checked) => setPublicChannel(!!checked)}
          />
          <FieldLabel htmlFor="public-channel">
            Public
          </FieldLabel>
        </Field>

        <Button
          variant="white"
          size="lg"
          className="w-full rounded-full"
          disabled={!lspQuoteData
            || !channelCapacity
            || !clientBalanceSat
            || !expiryBlocks
            || (type === "BTC/RGB" && !selectedContract)
          }
          onClick={checkOrder}
        >Next</Button>
      </Content>

      {
        showConfirm ? (
          <ConfirmDialog
            onClose={() => setShowConfirm(false)}
            data={{
              type: type as 'BTC' | 'BTC/RGB',
              channel_capacity_sat: channelCapacity,
              onchain_cost_sat: lspQuoteData?.pricing.onchain_cost_sat ?? "0",
              btc_capacity_ppm_per_year: lspQuoteData?.pricing.btc_capacity_ppm_per_year ?? 0,
              asset_rent_ppm_per_year: selectedContract?.asset_rent_ppm_per_year ?? 0,
              asset_unit_price_sat: selectedContract?.asset_unit_price_sat ?? "0",
              client_balance_sat: clientBalanceSat,
              public_channel: publicChannel,

              lsp_address: selectedLsp?.address ?? '',
              expiry_blocks: expiryBlocks,
              asset_id: selectedContract?.asset_id ?? '',
              asset_amount: lspAssetBalance,
              asset_name: selectedContract?.ticker ?? '',
              asset_precision: selectedContract?.precision ?? 0,
            }}
          />
        ) : null
      }
    </>
  )
}


function Loading() {
  return (
    <Content className="flex flex-col items-center justify-center h-[536px]">
      <Spinner className="w-11 h-11" />
      <div className="mt-10 text-base leading-5">Getting quotes...</div>
    </Content>
  )
}

function Empty() {
  const nav = useNavigate()

  return (
    <Content>
      <div className="flex flex-col items-center justify-center mx-auto w-[460px] h-[536px]">
        <div className="mt-10 text-base leading-5">No LSP Available</div>
        <div className="mt-2 text-xs leading-[18px] text-secondary-foreground text-center">
          No active Lightning Service Providers (LSPs) are
          available to establish a channel right now.
        </div>
        <div className="mt-10">
          <Button
            variant="destructive"
            size="lg"
            className="w-[150px] rounded-full"
            onClick={() => nav(-1)}
          >
            <IconBack style={{width: '20px', height: '20px'}} />
            <span>Go Back</span>
          </Button>
        </div>
      </div>
    </Content>
  )
}

function Failed() {
  const nav = useNavigate()

  return (
    <Content>
      <div className="flex flex-col items-center justify-center mx-auto w-[460px] h-[536px]">
        <div className="mt-10 text-base leading-5">Unable to Retrieve LSPs</div>
        <div className="mt-2 text-xs leading-[18px] text-secondary-foreground text-center">
          We are having trouble fetching the available Lightning Service
          Providers right now. Check your network and try again.
        </div>
        <div className="mt-10">
          <Button
            variant="destructive"
            size="lg"
            className="w-[114px] rounded-full"
            onClick={() => {}}
          >
            <IconRefresh style={{width: '20px', height: '20px'}} />
            <span>Retry</span>
          </Button>
        </div>
      </div>
    </Content>
  )
}
