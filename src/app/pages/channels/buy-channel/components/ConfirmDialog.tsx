import AssetAvatar from "@/app/components/AssetAvatar";
import CachedBtcAddress from "@/app/components/CachedBtcAddress";
import { CopyTextInline } from "@/app/components/CopyText";
import Fee from "@/app/components/Fee";
import Row from "@/app/components/Row";
import WalletBtcBalance from "@/app/components/WalletBtcBalance";
import { BITCOIN_MONTH_BLOCKS, LSP_CLIENT_BALANCE_TIP } from "@/app/config/constant";
import IconHelp from "@/app/icons/help";
import IconInfo from "@/app/icons/info";
import { useBuyBtcChannelMutation, useBuyRgbChannelMutation } from "@/app/mutations/lsp";
import { useNodeWalletSendMutation } from "@/app/mutations/wallet";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { errorToText } from "@/lib/errorToText";
import type { LspOrdersResponse } from "@/lib/sdk/types";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface IProps {
  onClose?: () => void;
  data: {
    type: 'BTC' | 'BTC/RGB';
    channel_capacity_sat: string;
    onchain_cost_sat: string;
    btc_capacity_ppm_per_year: number;
    asset_rent_ppm_per_year: number;
    asset_unit_price_sat: string;
    client_balance_sat: string;
    public_channel: boolean;

    lsp_address: string;
    expiry_blocks: number;
    asset_id: string;
    asset_amount: string;
    asset_name: string;
    asset_precision: number;
  }
}

const VITE_BITCOIN_DUST = import.meta.env.VITE_BITCOIN_DUST

export default function ConfirmDialog(props: IProps) {
  const { data } = props;
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;
  const [feeRate, setFeeRate] = useState("0");

  // Direct pay the order if the user has enough balance, otherwise redirect to the pay page
  const [directPay, setDirectPay] = useState(false);
  const btcBalanceRef = useRef<string>('0');
  const [orderData, setOrderData] = useState<LspOrdersResponse | null>(null)

  const buyBtcMutation = useBuyBtcChannelMutation();
  const buyRgbMutation = useBuyRgbChannelMutation();
  const walletSendMutation = useNodeWalletSendMutation();

  const buyBtcChannel = async () => {
    const data = props.data;
    if(!activeNodeId) {
      return;
    }

    try {
      setLoading(true);
      const payload = {
        client_balance_sat: data.client_balance_sat,
        lsp_balance_sat: (BigInt(data.channel_capacity_sat) - BigInt(data.client_balance_sat)).toString(),
        channel_expiry_blocks: data.expiry_blocks,
        announce_channel: data.public_channel
      };
      const res = await buyBtcMutation.mutateAsync({
        nodeId: activeNodeId,
        request: payload,
      });
      const orderId = res.order_id;

      const total = res.payment.onchain.order_total_sat;
      if(BigInt(btcBalanceRef.current) > BigInt(total) + BigInt(VITE_BITCOIN_DUST)) {
        setDirectPay(true);
        setOrderData(res);
      } else {
        nav(`/dashboard/channels/buy-pay?orderId=${orderId}`, {replace: true});
      }
    } catch(e) {
      toast.error(errorToText(e));
    } finally {
      setLoading(false);
    }
  }

  const buyRgbChannel = async () => {
    const data = props.data;
    if(!activeNodeId) {
      return;
    }

    try {
      setLoading(true);
      const precision = data.asset_precision;
      const payload = {
        asset_id: data.asset_id,
        lsp_asset_balance: (BigInt(data.asset_amount) * BigInt(10 ** precision)).toString(),
        client_asset_balance: '0',

        client_balance_sat: data.client_balance_sat,
        lsp_balance_sat: (BigInt(data.channel_capacity_sat) - BigInt(data.client_balance_sat)).toString(),
        channel_expiry_blocks: data.expiry_blocks,
        announce_channel: data.public_channel
      };
      const res = await buyRgbMutation.mutateAsync({
        nodeId: activeNodeId,
        request: payload,
      });
      const orderId = res.order_id;

      const total = res.payment.onchain.order_total_sat;
      if(BigInt(btcBalanceRef.current) > BigInt(total) + BigInt(VITE_BITCOIN_DUST)) {
        setDirectPay(true);
        setOrderData(res);
      } else {
        nav(`/dashboard/channels/buy-pay?orderId=${orderId}`, {replace: true});
      }
    } catch(e) {
      toast.error(errorToText(e));
    } finally {
      setLoading(false);
    }
  }

  const pay = async () => {
    if(props.data.type === 'BTC') {
      buyBtcChannel();
    } else {
      buyRgbChannel();
    }
  }

  const sendBtc = async () => {
    if(!activeNodeId || !orderData) {
      return;
    }

    try {
      const address = orderData.payment.onchain.address;
      const total = orderData.payment.onchain.order_total_sat;
      const orderId = orderData.order_id;
      const res = await walletSendMutation.mutateAsync({
        nodeId: activeNodeId,
        request: {
          address: address,
          amount_sats: total,
          fee_rate_sats_per_vb: Number(feeRate),
        }
      });

      nav(`/dashboard/channels/buy-pay-result?orderId=${orderId}`, {replace: true});

    } catch (e) {
      toast.error(errorToText(e));
    }
  }

  const cancelDirectPay = () => {
    const orderId = orderData?.order_id;
    setDirectPay(false);
    nav(`/dashboard/channels/buy-pay?orderId=${orderId}`, {replace: true});
  }

  const calculateTotalToPay = () => {
    // rent_fee = capacity * PPM / 1_000_000 / 12 * months
    // about_need_to_pay =
    //    onchain_cost_sat + btc_rent_fee + rgb_rent_fee + client_balance_sat
    const months = BigInt(data.expiry_blocks) / BigInt(BITCOIN_MONTH_BLOCKS);
    const client_balance_sat = BigInt(data.client_balance_sat);
    const btc_rent_fee = BigInt(data.channel_capacity_sat)
      * BigInt(data.btc_capacity_ppm_per_year)
      / BigInt(1_000_000)
      / 12n
      * months;

    if(data.type === 'BTC') {
      return {
        total: (BigInt(data.onchain_cost_sat) + btc_rent_fee + client_balance_sat).toString(),
        btc_rent_fee: btc_rent_fee.toString(),
        rgb_rent_fee: '0',
        client_balance_sat: client_balance_sat.toString()
      }

    }

    // RGB
    // const precision = data.asset_precision;
    const rgb_rent_fee = BigInt(data.asset_unit_price_sat)
      // Not include precision
      * BigInt(data.asset_amount)
      * BigInt(data.asset_rent_ppm_per_year)
      / BigInt(1_000_000)
      / 12n
      * months;
    return {
      total: (BigInt(data.onchain_cost_sat) + btc_rent_fee + rgb_rent_fee + client_balance_sat).toString(),
      btc_rent_fee: btc_rent_fee.toString(),
      rgb_rent_fee: rgb_rent_fee.toString(),
      client_balance_sat: client_balance_sat.toString()
    };
  }

  const renderContent = () => {
    if(directPay) {
      return (
        <>
          <Field>
            <FieldLabel>Fee</FieldLabel>
            <div>
              <Input
                className="bg-background-4"
                readOnly
                value={orderData?.payment.onchain.order_total_sat ?? ''}
              />
            </div>
          </Field>
          <Field>
            <FieldLabel>Fee</FieldLabel>
            <div>
              <Fee onFeeChange={setFeeRate} />
            </div>
          </Field>
          <div className="flex gap-3">
            <Button
              type="button"
              size="lg"
              variant="destructive"
              className="bg-background-3 w-[120px] shrink-0 rounded-full"
              onClick={cancelDirectPay}
            >Cancel</Button>
            <Button
              type="button"
              size="lg"
              variant="white"
              className="flex-1 rounded-full"
              disabled={feeRate === '0' || !orderData}
              loading={walletSendMutation.isPending}
              onClick={sendBtc}
            >Pay</Button>
          </div>
        </>
      );
    }

    const totalToPay = calculateTotalToPay();
    const lspFee = BigInt(totalToPay.total) - BigInt(data.client_balance_sat);

    return (
      <>
        <div>
          <label className="leading-5 text-secondary-foreground text-xs">Total to Pay</label>
          <div className="mt-2 flex justify-between">
            <div>
              <span className="text-[34px] font-bold">{totalToPay.total}</span>
              <span className="text-xl font-bold ml-2">sats</span>
            </div>
            <div className="text-right">
              <div className="h-5 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="text-xs text-secondary-foreground">Available Balance:</span>
              </div>
              <div className="leading-5">
                <span className="text-xs text-secondary-foreground">
                  <WalletBtcBalance
                    nodeId={activeNodeId ?? ''}
                    onBalanceLoad={(v) => btcBalanceRef.current = v}
                  />
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs text-secondary-foreground">
            The fee is an approximate estimate and is subject to change.
          </div>
        </div>

        <div>
          <div className="bg-background-3 rounded-3xl space-y-4 px-4 py-4">
            <Row
              className="text-secondary-foreground"
              label={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-secondary-foreground">
                      <span>Client Balance</span>
                      <IconHelp />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent align="start" className="w-[250px] border border-background-4">
                    <p>{LSP_CLIENT_BALANCE_TIP}</p>
                  </TooltipContent>
                </Tooltip>
              }
              value={<span className="font-medium text-foreground">{data.client_balance_sat} sats</span>}
            />
            <Row
              className="text-secondary-foreground"
              label={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-secondary-foreground">
                      <span>LSP Fee</span>
                      <IconHelp />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent align="start" className="w-[250px] border border-background-4">
                    <div>
                      <Row
                        className="text-secondary-foreground text-2xs"
                        label="On-chain Cost Fee"
                        value={<span className="text-foreground">{data.onchain_cost_sat} sats</span>}
                      />
                      <Row
                        className="text-secondary-foreground text-2xs"
                        label="BTC Rent Fee"
                        value={<span className="text-foreground">{totalToPay.btc_rent_fee} sats</span>}
                      />
                      {
                        data.type === 'BTC/RGB' ? (
                          <Row
                            className="text-secondary-foreground text-2xs"
                            label="RGB Rent Fee"
                            value={<span className="text-foreground">{totalToPay.rgb_rent_fee} sats</span>}
                          />
                        ) : null
                      }
                    </div>
                  </TooltipContent>
                </Tooltip>
              }
              value={<span className="font-medium text-foreground">{lspFee.toString()} sats</span>}
            />
          </div>
          <div className="mt-3 bg-background-3 rounded-3xl space-y-4 px-4 py-4">
            <Row
              className="text-secondary-foreground"
              label="LSP (Provider)"
              value={<span className="font-medium text-foreground">{data.lsp_address}</span>}
            />
            <Row
              className="text-secondary-foreground"
              label="Channel Capacity"
              value={<span className="font-medium text-foreground">{data.channel_capacity_sat} sats</span>}
            />
            <Row
              className="text-secondary-foreground"
              label="Channel Lease Term"
              value={<span className="font-medium text-foreground">{BigInt(data.expiry_blocks) / BigInt(BITCOIN_MONTH_BLOCKS)} months</span>}
            />
            <Row
              className="text-secondary-foreground"
              label="Channel Type"
              value={<span className="font-medium text-foreground">{data.public_channel ? 'Public' : 'Private'}</span>}
            />
            <Separator className="bg-background-2" />

            <Row
              className="text-secondary-foreground"
              label="Asset Type"
              value={<span className="font-medium text-foreground">{data.type}</span>}
            />
            {
              data.type === 'BTC/RGB' ? (
                <Row
                  className="h-auto text-secondary-foreground"
                  label="RGB Asset"
                  value={
                    <div>
                      <div className="h-5 flex items-center justify-end gap-2 text-base text-foreground">
                        <AssetAvatar className="w-5 h-5" name={data.asset_name} />
                        <span className="font-medium">{data.asset_name}</span>
                      </div>
                      <div className="mt-1">
                        <CopyTextInline text={data.asset_id} />
                      </div>
                    </div>
                  }
                />
              ) : null
            }
            {
              data.type === 'BTC/RGB' ? (
                <Row
                  className="text-secondary-foreground"
                  label="RGB Amount"
                  value={<span className="font-medium text-foreground">{data.asset_amount}</span>}
                />
              ) : null
            }
            {
              data.type === 'BTC/RGB' ? (
                <Row
                  className="text-secondary-foreground"
                  label="Asset Rent (ppm per year)"
                  value={<span className="font-medium text-foreground">{data.asset_rent_ppm_per_year} sats</span>}
                />
              ) : null
            }
            {
              data.type === 'BTC/RGB' ? (
                <Row
                  className="text-secondary-foreground"
                  label="Asset Unit Price"
                  value={<span className="font-medium text-foreground">{data.asset_unit_price_sat} sats</span>}
                />
              ): null
            }
            <Separator className="bg-background-2" />
            <div>
              <label className="text-base text-secondary-foreground">Refund Address</label>
              <div className="h-5 mt-2 flex items-center gap-2 text-base">
                <CachedBtcAddress />
              </div>
              <div className="mt-[14px] flex items-center gap-2 text-base text-secondary-foreground">
                <IconInfo />
                <span>Payment will be refunded here if channel fails to open.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="destructive"
            size="lg"
            className="w-full rounded-full"
            onClick={props.onClose}
          >Back</Button>

          <Button
            variant="white"
            size="lg"
            className="w-full rounded-full"
            disabled={loading}
            loading={loading}
            onClick={pay}
          >Confirm & Pay</Button>
        </div>
      </>
    )
  }

  return (
    <Dialog open onOpenChange={props.onClose}>
      <DialogContent className="w-[560px]">
        <DialogHeader>
          <DialogTitle>Confirm Channel Purchase</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}
