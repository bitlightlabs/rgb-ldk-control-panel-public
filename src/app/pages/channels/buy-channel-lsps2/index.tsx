import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import BtcConfirmDialog from "./components/BtcConfirmDialog";
import { useContextStore } from "@/app/stores/contextStore";
import { Tabs, TabsList } from "@/components/ui/tabs";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TabsCustomerTrigger from "../buy-channel/components/TabTrigger";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import LSPSelect from "../buy-channel/components/LSPSelect";
import type { LspConnectionInfo, LspPricingAsset, LspQuoteData } from "@/lib/sdk/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNodeLsps2QuoteMutation } from "@/app/mutations/lsp";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";
import Row from "@/app/components/Row";
import { formatNumber } from "@/lib/number";
import type { Lsps2QuoteResponse } from "@/lib/sdk/generated-types";
import RgbConfirmDialog from "./components/RgbConfirmDialog";
import { nodeQueryLspQuote } from "@/lib/commands";
import LspAssetSelect from "../buy-channel/components/LspAssetSelect";

const MIN_RGB_CHANNEL_SATS = 12000n;

export default function LSPS2Page() {
  const nav = useNavigate()
  const [type, setType] = useState("BTC");

  const changeType = (type: string) => {
    setType(type);
  }

  return (
    <ContentWrapper className="mb-10">
      <ContentHeader title="Buy Channel" onBack={() => nav(-1)} />
      <Content className="space-y-8">
        <Tabs value={type} onValueChange={changeType}>
          <TabsList className="h-10 px-1 py-1 inline-flex bg-background gap-1 rounded-full">
            <TabsCustomerTrigger page="BTC" />
            <TabsCustomerTrigger page="BTC/RGB" />
          </TabsList>
        </Tabs>
        {
          type === 'BTC' ? <BtcForm /> : <RgbForm />
        }
      </Content>
    </ContentWrapper>
  )
}

function BtcForm() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedLsp, setSelectedLsp] = useState<LspConnectionInfo | null>(null);
  const [btcQuote, setBtcQuote] = useState<Lsps2QuoteResponse | null>(null);
  const [receiveAmountSats, setReceiveAmountSats] = useState<string>('');
  const [receiveAmountError, setReceiveAmountError] = useState<string>('');
  const currentContext = useContextStore((s) => s.currentContext);
  
  const activeNodeId = currentContext?.node_id;
  const btcQuoteMutation = useNodeLsps2QuoteMutation();

  const queryBtcQuote = async (lsp: LspConnectionInfo) => {
    if(!activeNodeId) {
      return;
    }

    try {
      const res = await btcQuoteMutation.mutateAsync({
        nodeId: activeNodeId,
        request: {
          "lsp_node_id": lsp.pubkey,
        }
      })
      setBtcQuote(res)
    } catch(e) {
      toast.error(errorToText(e))
    }
  }

  const changeLsp = async (lsp: LspConnectionInfo) => {
    setSelectedLsp(lsp);

    queryBtcQuote(lsp);
  }

  const makeAmountPlaceholder = () => {
    let min = '';
    let max = '';
    if(btcQuote) {
      min = formatNumber(btcQuote.offers[0]?.min_payment_size_msat ?? '', 3);
      max = formatNumber(btcQuote.offers[0]?.max_payment_size_msat ?? '', 3);

      return min + ' - ' + max;
    }
    return '0';
  }

  const changeReceiveAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if(v === '') {
      setReceiveAmountSats(v);
      setReceiveAmountError('');
      return;
    }

    if(isNaN(Number(v))) {
      return;
    }

    if(btcQuote) {
      const min = btcQuote.offers[0]?.min_payment_size_msat ?? '0';
      const max = btcQuote.offers[0]?.max_payment_size_msat ?? '0';
      if(BigInt(v) * 1000n < BigInt(min) || BigInt(v) * 1000n > BigInt(max)) {
        setReceiveAmountError(`Amount must must fall within the range of ` + formatNumber(min, 3) + ` to ` + formatNumber(max, 3));
      } else {
        setReceiveAmountError('');
      }
    }

    setReceiveAmountSats(v);
  }

  const checkOrder = () => {
    const minPayment = btcQuote?.offers[0]?.min_payment_size_msat ?? '0';
    const maxPayment = btcQuote?.offers[0]?.max_payment_size_msat ?? '0';

    const userInputMsats = BigInt(receiveAmountSats) * 1000n;
    if(userInputMsats < BigInt(minPayment)) {
      toast.error('Amount is below the minimum limit: ' + formatNumber(minPayment, 3));
      return
    }
    if(userInputMsats > BigInt(maxPayment)) {
      toast.error('Amount is above the maximum limit: ' + formatNumber(maxPayment, 3));
      return
    }

    setShowConfirmDialog(true)
  }

  return (
    <>
      <div>
        <Field>
          <FieldLabel>LSP (Provider)</FieldLabel>
          <LSPSelect
            value={selectedLsp}
            onChange={changeLsp}
          />
        </Field>
        {btcQuote ? (
          <div className="mt-3 bg-background-3 rounded-3xl space-y-2 px-4 py-3">
            <Row
              className="text-xs text-secondary-foreground"
              label="Min Payment"
              value={
                <span>
                  {formatNumber(btcQuote.offers[0]?.min_payment_size_msat ?? '', 3)} sats
                </span>
              }
            />
            <Row
              className="text-xs text-secondary-foreground"
              label="Max Payment"
              value={
                <span>
                  {formatNumber(btcQuote.offers[0]?.max_payment_size_msat ?? '', 3)} sats
                </span>
              }
            />
          </div>
        ) : null}
      </div>

      <Field>
        <FieldLabel>Receive Amount</FieldLabel>
        <Input
          className="bg-background-4"
          placeholder={makeAmountPlaceholder()}
          value={receiveAmountSats}
          slot={<span>sats</span>}
          onChange={changeReceiveAmount}
        />
        <FieldError>{receiveAmountError}</FieldError>
      </Field>

      <Button
        variant="white"
        size="lg"
        className="w-full rounded-full"
        disabled={!selectedLsp || !receiveAmountSats}
        onClick={checkOrder}
      >Next</Button>

      {
        showConfirmDialog ? (
          <BtcConfirmDialog
            lsp={selectedLsp!}
            receiveAmountSats={receiveAmountSats}
            onClose={() => setShowConfirmDialog(false)}
          />
        ) : null
      }
    </>
  )
}

function RgbForm() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const currentContext = useContextStore((s) => s.currentContext);
  const [selectedContract, setSelectedContract] = useState<LspPricingAsset | null>(null);
  const [rgbAssetAmount, setRgbAssetAmount] = useState("");
  const [channelAmountSats, setChannelAmountSats] = useState("")
  const [selectedLsp, setSelectedLsp] = useState<LspConnectionInfo | null>(null);
  const [lsps1SupportAssets, setLsps1SupportAssets] = useState<LspPricingAsset[] | null>(null);
  const [lsps1Data, setLsps1Data] = useState<LspQuoteData | null>(null);
  const [capacityError, setCapacityError] = useState<string>("");
  const [rgbAmountError, setRgbAmountError] = useState<string>("");
  
  const activeNodeId = currentContext?.node_id;

  const preQueryLspInfo = async (lsp: LspConnectionInfo) => {
    if(!activeNodeId) {
      return;
    }
    try {
      // Use LSPS1 to pre-query LSP info and get supported RGB assets
      const res = await nodeQueryLspQuote(activeNodeId, lsp.pubkey);
      const find = res.lsps[0];
      if(!find) {
        return;
      }
      const assets = find.info.rgb.rgb_assets || []
      setLsps1SupportAssets(assets);
      setLsps1Data(find.info);
    } catch(e) {}
  }

  const changeLsp = async (lsp: LspConnectionInfo) => {
    setSelectedLsp(lsp);
    preQueryLspInfo(lsp);
  }

  const changeCapacity = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(!lsps1Data) {
      return;
    }
    const v = e.target.value;
    if(isNaN(Number(v))) {
      return;
    }

    if(v !== '') {
      try {
        const min = lsps1Data.supported_options.min_channel_balance_sat;
        const max = lsps1Data.supported_options.max_channel_balance_sat;

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

    setChannelAmountSats(v)
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

    setRgbAssetAmount(v);
  }

  const checkOrder = () => {
    // check channel capacity range
    const maxCapacity = lsps1Data?.supported_options.max_channel_balance_sat ?? '0';
    const minCapacity = lsps1Data?.supported_options.min_channel_balance_sat ?? '0';
    if(BigInt(channelAmountSats) > BigInt(maxCapacity)) {
      toast.error('The channel capacity exceeds the limit: ' + maxCapacity);
      return;
    }
    if(BigInt(channelAmountSats) < BigInt(minCapacity)) {
      toast.error('The channel capacity is below the minimum limit: ' + minCapacity);
      return;
    }
    if(BigInt(channelAmountSats) < MIN_RGB_CHANNEL_SATS) {
      toast.error('The channel capacity is below the minimum limit: ' + MIN_RGB_CHANNEL_SATS);
      return;
    }

    // check asset range
    const asset = lsps1SupportAssets?.find((a) => a.asset_id === selectedContract?.asset_id);
    if(!asset) {
      return;
    }
    const precision = asset.precision;
    const max = BigInt(asset.max_lsp_asset_balance) / BigInt(10 ** precision);
    const min = BigInt(asset.min_lsp_asset_balance) / BigInt(10 ** precision);
    const userInput = BigInt(rgbAssetAmount);
    if(userInput > BigInt(max)) {
      toast.error('Asset amount exceeds the limit: ' + max);
      return;
    }
    if(userInput < BigInt(min)) {
      toast.error('Asset amount is below the minimum limit: ' + min);
      return;
    }
    
    setShowConfirmDialog(true);
  }

  return (
    <>
      <div>
        <Field>
          <FieldLabel>LSP (Provider)</FieldLabel>
          <LSPSelect
            value={selectedLsp}
            onChange={changeLsp}
          />
        </Field>
        {lsps1Data ? (
          <div className="mt-3 bg-background-3 rounded-3xl space-y-2 px-4 py-3">
            <Row
              className="text-xs text-secondary-foreground"
              label="Supported Assets"
              value={lsps1SupportAssets && lsps1SupportAssets.length > 0
                ? 'BTC/RGB'
                : 'BTC'
              }
            />
            <Row
              className="text-xs text-secondary-foreground"
              label="Channel Capacity"
              value={
                lsps1Data?.supported_options.min_channel_balance_sat
                  + ' - ' + lsps1Data?.supported_options.max_channel_balance_sat + ' sats'
              }
            />
          </div>
        ) : null}
      </div>
      <Field>
        <FieldLabel>
          Channel Capacity
        </FieldLabel>
        <Input
          className="bg-background-4"
          placeholder={lsps1Data === null
            ? "0"
            : `${lsps1Data.supported_options.min_channel_balance_sat} - ${lsps1Data.supported_options.max_channel_balance_sat}`
          }
          slot={<span>sats</span>}
          value={channelAmountSats}
          onChange={changeCapacity}
        />
        <FieldError>{capacityError}</FieldError>
      </Field>
      <Field>
        <FieldLabel>
          Receive Asset
        </FieldLabel>
        <LspAssetSelect
          contracts={lsps1SupportAssets ?? []}
          selectedAssetId={selectedContract?.asset_id ?? ""}
          onChange={(contract) => setSelectedContract(contract)}
        />
        <Input
          className="bg-background-4"
          placeholder={selectedContract === null
            ? "Amount"
            : `Amount (${formatNumber(selectedContract.min_lsp_asset_balance, selectedContract.precision)} - ${formatNumber(selectedContract.max_lsp_asset_balance, selectedContract.precision)})`
          }
          slot={<span>{selectedContract?.ticker}</span>}
          value={rgbAssetAmount}
          onChange={changeRgbAmount}
        />
        <FieldError>{rgbAmountError}</FieldError>
      </Field>

      <Button
        variant="white"
        size="lg"
        className="w-full rounded-full"
        disabled={!selectedLsp || !selectedContract || !rgbAssetAmount || !channelAmountSats}
        onClick={checkOrder}
      >Next</Button>

      {
        showConfirmDialog ? (
          <RgbConfirmDialog
            lsp={selectedLsp!}
            asset={selectedContract!}
            receiveAmountRgb={rgbAssetAmount}
            channelAmountSats={channelAmountSats}
            onClose={() => setShowConfirmDialog(false)}
          />
        ) : null
      }
    </>
  )
}
