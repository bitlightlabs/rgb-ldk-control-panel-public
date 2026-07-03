import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { ComplexInput } from "@/components/ui/input";
import Fee from "./Fee";
import { useRef, useState } from "react";
import CopyText from "./CopyText";
import Row from "./Row";
import WalletBtcBalance from "./WalletBtcBalance";
import { useContextStore } from "../stores/contextStore";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";
import { formatAddress, selectUtxos } from "@/lib/utils";
import type { RgbUtxoDto } from "@/lib/sdk/generated-types";
import {
  useNodeWalletL1UtxosMutation,
  useNodeRgbNewAddressMutation,
  useNodeWalletNewAddressMutation,
  useRgbUtxoTopUpMutation,
} from "@/app/mutations";

interface IProps {
  utxo: RgbUtxoDto
  onClose: () => void
  onSuccess: () => void
}
export default function UtxoAddBalanceDialog(props: IProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'preview'>('form')
  const [feeRate, setFeeRate] = useState('0')
  const [amount, setAmount] = useState('')
  const [to, setTo] = useState('')
  const [changeAddress, setChangeAddress] = useState('')
  const currentContext = useContextStore((state) => state.currentContext);
  const balance = useRef('0')
  const [error, setError] = useState('')
  const rgbNewAddressMutation = useNodeRgbNewAddressMutation();
  const walletNewAddressMutation = useNodeWalletNewAddressMutation();
  const walletL1UtxosMutation = useNodeWalletL1UtxosMutation();
  const rgbUtxoTopUpMutation = useRgbUtxoTopUpMutation();

  const next = async () => {
    if(!currentContext) {
      return
    }

    if(BigInt(amount) >= BigInt(balance.current)) {
      setError('Insufficient balance')
      return;
    }

    const oldValue = props.utxo.value_sats
    if(BigInt(amount) <= BigInt(oldValue)) {
      setError('Amount must be greater than current UTXO value')
      return;
    }

    try {
      setLoading(true)

      const nodeId = currentContext.node_id ?? ''

      // prepare to & change address
      const rgbAddress = await rgbNewAddressMutation.mutateAsync(nodeId)
      const changeAddress = await walletNewAddressMutation.mutateAsync(nodeId)

      setTo(rgbAddress.address)
      setChangeAddress(changeAddress.address)
      setStep('preview')
    } catch(e) {
      toast.error(errorToText(e))
    } finally {
      setLoading(false)
    }
  }

  const pay = async () => {
    if(!currentContext) {
      return
    }

    try {
      setLoading(true)

      const nodeId = currentContext.node_id

      // 1. Query unspent UTXOs
      const utxos = await walletL1UtxosMutation.mutateAsync(nodeId)
      const selected = selectUtxos(utxos.utxos, amount)

      // 2. Create payload
      const l1Inputs = selected.map((utxo) => {
        return {
          outpoint: utxo.outpoint,
        }
      })
      const rgbOutput = { address: to, target_value_sats: amount }
      const payload = {
        rgb_input: {
          outpoint: props.utxo.outpoint
        },
        l1_inputs: l1Inputs,
        rgb_output: rgbOutput,
        change_address: changeAddress,
        fee_rate_sats_per_vb: Number(feeRate)
      }

      // 2. Top up
      console.log('payload', payload)
      await rgbUtxoTopUpMutation.mutateAsync({
        nodeId,
        request: payload,
      })

      toast.success('UTXO balance added successfully')
      props.onClose()
      props.onSuccess()

    } catch(e) {
      toast.error(errorToText(e))
    } finally {
      setLoading(false)
    }
  }

  const changeAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value)
    if(error !== '') {
      setError('')
    }
  }

  const renderContent = () => {
    if(step === 'preview') {
      return (
        <DialogContent className="w-[560px] px-5 py-5">
          <DialogHeader>
            <DialogTitle>Sign Transaction</DialogTitle>
          </DialogHeader>
          <div className="text-center font-bold">
            <div>
              <span className="text-[34px]">{amount}</span>
              <span className="pl-2 text-xl">sats</span>
            </div>
            <div className="mt-2 text-xs text-secondary-foreground font-normal">UTXO Value</div>
          </div>
          <div className="bg-background-2 rounded-3xl p-4 space-y-4">
            <Row
              label="To"
              value={
                <div className="h-full flex items-center gap-2">
                  <span>{formatAddress(to)}</span>
                  <CopyText className="text-secondary-foreground" text={to} />
                </div>
              }
            />
            <div className="h-[1px] border border-dashed border-t-background-2" />
            {/* <Row
              label="Network fee"
              value="1546 sats"
            /> */}
            <Row
              label="Fee Rate"
              value={`${feeRate} sats/vb`}
            />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              type="button"
              size="lg"
              className="rounded-full flex-1"
              disabled={loading}
              onClick={props.onClose}
            >
              Reject
            </Button>
            <Button
              variant="white"
              type="button"
              size="lg"
              className="rounded-full flex-1"
              loading={loading}
              disabled={loading}
              onClick={pay}
            >
              Pay & Create
            </Button>
          </DialogFooter>
        </DialogContent>
      )
    }

    return (
      <DialogContent className="w-[560px] px-5 py-5">
        <DialogHeader>
          <DialogTitle>Add UTXO Balance</DialogTitle>
        </DialogHeader>
        <Field data-invalid={error !== ''}>
          <FieldLabel>UTXO Value</FieldLabel>
          <ComplexInput
            value={amount}
            onChange={changeAmount}
            slot={
              <div className="h-7 flex items-center gap-2.5">
                <span className="text-base">
                  sats
                </span>
                {/* <Button
                  className="h-7 rounded-full text-xs"
                >MAX</Button> */}
              </div>
            }
            bottom={
              <span className="text-xs text-secondary-foreground">
                <span>Available: </span>
                <WalletBtcBalance
                  nodeId={currentContext?.node_id ?? ''}
                  onBalanceLoad={(v) => balance.current = v}
                />
              </span>
            }
          />
          <div className="text-base text-secondary-foreground">
            Move BTC to pre-fund UTXO for RGB20 transaction fees.
          </div>
          <FieldError>{error}</FieldError>
        </Field>
        <Field>
          <FieldLabel>Fee</FieldLabel>
          <div>
            <Fee onFeeChange={setFeeRate} />
          </div>
        </Field>

        <DialogFooter>
          <Button
            variant="destructive"
            type="button"
            size="lg"
            className="rounded-full flex-1"
            onClick={props.onClose}
          >
            Cancel
          </Button>
          <Button
            variant="white"
            type="button"
            size="lg"
            className="rounded-full flex-1"
            disabled={loading}
            onClick={next}
          >
            Review
          </Button>
        </DialogFooter>
      </DialogContent>
    )
  }

  return (
    <Dialog
      open
      onOpenChange={props.onClose}
    >
      {renderContent()}
    </Dialog>
  )
}
