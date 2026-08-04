import { Content, ContentWrapper } from "@/app/components/ContentWrapper";
import { ChannelAssetSelect } from "@/app/components/ChannelAssetSelect";
import SwapAmountPercent from "@/app/components/SwapAmountPercent";
import IconArrowDown from "@/app/icons/arrowdown";
import IconChange from "@/app/icons/change";
import IconRefresh from "@/app/icons/refresh";
import IconTriangleDown, { IconTriangleUp } from "@/app/icons/triangle";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { ComplexInput, Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import ConfirmDialog from "./components/ConfirmDialog";
import type { ChannelDetailsExtendedDto, RgbContractDto } from "@/lib/sdk/types";
import ChannelSelect from "./components/ChannelSelect";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatNumber } from "@/lib/number";
import IconReceive from "@/app/icons/receive";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import IconHelp from "@/app/icons/help";
import { BTC_CARRIER_TIP } from "@/app/config/constant";

export default function Swap() {
  const nav = useNavigate();
  const [error, setError] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fromAsset, setFromAsset] = useState<RgbContractDto | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAsset, setToAsset] = useState<RgbContractDto | null>(null);
  const [toAmount, setToAmount] = useState('');
  const [channel, setChannel] = useState<ChannelDetailsExtendedDto | null>(null);
  const [btcCarrierSats, setBtcCarrierSats] = useState<string>('');

  const confirmSwap = () => {
    if(!fromAsset || !toAsset || !fromAmount || !toAmount || !channel) {
      return
    }

    // Send btc receive asset
    if(fromAsset?.name === 'BTC') {
      if(BigInt(fromAmount) * 1000n >= BigInt(channel.outbound_capacity_msat)) {
        toast.error('Insufficient BTC balance on the Lightning Network.');
        return;
      }
    } else {
      // Send rgb asset receive btc
      let precision = fromAsset?.precision ?? 0;
      let assetBalance = channel.rgb_balance?.local_amount ?? 0;
      if(BigInt(fromAmount) * BigInt(10 ** precision) >= BigInt(assetBalance)) {
        toast.error('Insufficient asset balance on the Lightning Network.');
        return;
      }
    }

    // Must asset and BTC swap
    if((fromAsset?.name === 'BTC' && toAsset?.name === 'BTC')
      || (fromAsset?.name !== 'BTC' && toAsset?.name !== 'BTC')
    ) {
      toast.error('Swap transactions are exclusively conducted between assets and BTC.');
      return;
    }

    setShowConfirm(true);
  }

  const switchAsset = () => {
    let oldFromAsset = fromAsset;
    let oldFromAmount = fromAmount;

    setFromAsset(toAsset);
    setFromAmount(toAmount);

    setToAsset(oldFromAsset);
    setToAmount(oldFromAmount);
  }

  const renderChannelAvailable = () => {
    if(!channel || !fromAsset) {
      return '--'
    }

    if(fromAsset.name === 'BTC') {
      if(channel?.outbound_capacity_msat) {
        return formatNumber(channel.outbound_capacity_msat, 3) + ' sats'
      }
      return '--'
    }

    return (
      <span>
        {channel?.rgb_balance
          ? formatNumber(
            channel?.rgb_balance?.local_amount ?? 0,
            fromAsset.precision ?? 0
          )
          : '--'}
        <span>{' ' + (fromAsset.name ?? '')}</span>
      </span>
    )
  }

  return (
    <ContentWrapper className="mb-10">
      <div className="sticky top-0 z-40 flex h-[68px] justify-between items-center ">
        <h4 className="text-[22px] font-bold ml-2">Swap</h4>
        <div>
          <Button
            variant="white"
            className="rounded-full"
            onClick={() => nav("/dashboard/swap/accept")}
          >
            <IconReceive />
            <span>Accept Swap</span>
          </Button>
        </div>
      </div>

      {/* Maker */}
      {/* <Maker /> */}

      <Content className="mt-0 border-background-3">
        <Field>
          <FieldLabel>Channel</FieldLabel>
          <ChannelSelect
            onChange={setChannel}
          />
        </Field>
      </Content>
      <Content className="mt-4 relative space-y-1 border-background-3">
        <button
          type="button"
          className="group absolute z-50 left-[calc(50%-16px)] top-[130px] flex items-center justify-center px-0 py-0 w-8 h-8 bg-background-solid rounded-full border border-background-solid-3"
          onClick={switchAsset}
        >
          <IconArrowDown className="block group-hover:hidden text-secondary-foreground" style={{width: '16px', height: '16px'}} />
          <IconChange className="hidden group-hover:block" style={{width: '16px', height: '16px'}} />
        </button>

        {/* Send */}
        <Field data-invalid={error}>
          <ComplexInput
            placeholder="0"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            style={{fontSize: '22px'}}
            className="bg-background-4"
            top={<h4 className="mb-3 leading-[18px] text-xs text-secondary-foreground">You Send</h4>}
            subfix={
              <div className="absolute right-4 top-12 h-6 flex gap-3 items-center text-foreground">
                <span className="text-base shrink-0">
                  {fromAsset?.name === 'BTC' ? 'sats' : (fromAsset?.name)}
                </span>
                <ChannelAssetSelect
                  title="Select Send Assets"
                  channelContractId={channel?.rgb_balance?.contract_id ?? ''}
                  defaultShowBtc={true}
                  value={fromAsset}
                  onChange={setFromAsset}
                />
              </div>
            }
            bottom={
              <div className="flex justify-between">
                <div
                  className={"text-xs text-secondary-foreground " + (error ? 'text-error!' : '')}
                >
                  <span>Available: </span>
                  {renderChannelAvailable()}
                </div>
                {
                  fromAsset && channel ? (
                    <SwapAmountPercent
                      list={[{value: 25}, {value: 50}, {value: 75}, {value: 100}]}
                      value={0}
                      onChange={(v) => {
                        let total = 0n;
                        if(fromAsset?.name === 'BTC') {
                          total = BigInt(channel?.outbound_capacity_msat || 0) / 1000n
                          setFromAmount((total * BigInt(v) / 100n).toString());
                          return
                        }

                        total = BigInt(channel?.rgb_balance?.local_amount || 0) * BigInt(v) / 100n
                        let precision = fromAsset?.precision ?? 0
                        setFromAmount((total / BigInt(10 ** precision)).toString());
                      }}
                    />
                  ) : null
                }
              </div>
            }
          />
        </Field>

        {/* Receive */}
        <Field>
          <ComplexInput
            placeholder="0"
            value={toAmount}
            onChange={(e) => setToAmount(e.target.value)}
            className="bg-background-4"
            style={{fontSize: '22px'}}
            top={<h4 className="mb-3 leading-[18px] text-xs text-secondary-foreground">You Receive</h4>}
            subfix={
              <div className="absolute right-4 top-12 h-6 flex gap-3 items-center ">
                <span className="text-base shrink-0">
                  {toAsset?.name === 'BTC' ? 'sats' : (toAsset?.name)}
                </span>
                <ChannelAssetSelect
                  title="Select Receive Assets"
                  channelContractId={channel?.rgb_balance?.contract_id ?? ''}
                  value={toAsset}
                  onChange={setToAsset}
                />
              </div>
            }
          />
        </Field>

        <Field className="mt-8">
          <FieldLabel className="flex">
            <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 text-secondary-foreground">
                    <span>BTC Carrier</span>
                    <IconHelp />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="w-[254px]">
                  <div>{BTC_CARRIER_TIP}</div>
                </TooltipContent>
              </Tooltip>
          </FieldLabel>
          <Input
            placeholder="0"
            value={btcCarrierSats}
            onChange={(e) => setBtcCarrierSats(e.target.value)}
            className="bg-background-4"
            slot={<span>sats</span>}
          />
        </Field>

        {/* <div className="mt-4">
          <div className="flex justify-between text-base leading-5">
            <div className="text-secondary-foreground">Min: 100 sats, Max 10,000,000 sats</div>
            <div>1 sat = xxx USDT</div>
          </div>
        </div>
        <Fee /> */}

        <div className="mt-8">
          <Button
            variant="white"
            size="lg"
            className="w-full rounded-full"
            disabled={!fromAsset || !toAsset || !fromAmount || !toAmount || !channel}
            onClick={confirmSwap}
          >Swap</Button>
        </div>
      </Content>

      {
        showConfirm ? (
          <ConfirmDialog
            payload={{
              channel: channel,
              fromAsset: fromAsset,
              fromAmount: fromAmount,
              toAsset: toAsset,
              toAmount: toAmount,
              btcCarrierSats: btcCarrierSats,
            }}
            onClose={() => setShowConfirm(false)}
          />
        ) : null
      }
    </ContentWrapper>
  )
}

function Maker() {
  return (
    <Content>
      <div className="flex justify-between">
        <h4 className="text-base leading-5">Market Maker</h4>
        <div className="flex gap-3">
          <Status status="active" />
          <Button
            variant="ghost"
            className="h-5 w-5 px-0 py-0 rounded"
          >
            <IconRefresh style={{width: '16px', height: '16px'}} />
          </Button>
        </div>
      </div>
      <div className="mt-3">
        <Select>
          <SelectTrigger className="rounded-3xl bg-background-4 border-background-2">
            <SelectValue placeholder="Market Maker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mm1">Market Maker 1</SelectItem>
            <SelectItem value="mm2">Market Maker 2</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Content>
  )
}

function Fee() {
  const [show, setShow] = useState(false)

  return (
    <div className="mt-4">
      <div className="flex justify-between text-base leading-5">
        <div className="text-secondary-foreground">Total Fee</div>
        <div className="flex gap-2">
          <span>100 sats</span>
          <Button
            variant="ghost"
            className="px-0 py-0 h-5 w-5 rounded"
            onClick={() => setShow(!show)}
          >
            {
              show ? <IconTriangleUp /> : <IconTriangleDown />
            }

          </Button>
        </div>
      </div>

      {
        show ? (
          <div className="mt-3 px-4 py-4 rounded-2xl bg-background-3 space-y-4">
            <div className="h-5 flex justify-between items-center text-base">
              <label className="text-secondary-foreground">Base Fee</label>
              <div>--</div>
            </div>
            <div className="h-5 flex justify-between items-center text-base">
              <label className="text-secondary-foreground">Variable Fee</label>
              <div>--</div>
            </div>
          </div>
        ) : null
      }
    </div>
  )
}


function Status(props: { status: 'active' | 'inactive' }) {
  return (
    <div className="h-5 flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${props.status === 'active' ? 'bg-success' : 'bg-muted-foreground'}`} />
      <span className={`text-xs ${props.status === 'active' ? 'text-success' : 'text-muted-foreground'}`}>
        {props.status === 'active' ? 'Online' : 'Offline'}
      </span>
    </div>
  )
}
