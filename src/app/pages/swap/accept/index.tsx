import AssetAvatar from "@/app/components/AssetAvatar";
import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { CopyTextInline } from "@/app/components/CopyText";
import Row from "@/app/components/Row";
import { useNodeSwapAcceptMutation } from "@/app/mutations/swap";
import { useNodeRgbContractsQuery } from "@/app/queries";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { nodeSwapDecode } from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import { formatNumber } from "@/lib/number";
import type { RgbContractDto, SwapInfo } from "@/lib/sdk/types";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Accept() {
  const nav = useNavigate();
  const [error, setError] = useState(false);
  const [payload, setPayload] = useState('');
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [contract, setContract] = useState<RgbContractDto | null>(null);
  const [decodedSwap, setDecodedSwap] = useState<SwapInfo | null>(null);
  const { currentContext } = useContextStore();
  const activeNodeId = currentContext?.node_id;

  const contractsQuery = useNodeRgbContractsQuery(activeNodeId, {
    staleTime: 30_000,
  });
  const list = contractsQuery.data?.contracts ?? [];

  const changePayload = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPayload(e.target.value);
    setError(false);
  }

  const decodeSwap = async () => {
    if(!activeNodeId) {
      return
    }

    try {
      const data = await nodeSwapDecode(activeNodeId, payload);
      const contractId = data.contract_id;
      const contract = list.find((c) => c.contract_id === contractId);

      if(!contract) {
        setError(true);
        return
      }

      setContract(contract || {} as RgbContractDto);
      setDecodedSwap(data);
      setShowAcceptDialog(true);
    } catch(e) {
      toast.error(errorToText(e));
    }
  }

  return (
    <>
      <ContentWrapper>
        <ContentHeader
          title="Accept Swap"
          onBack={() => nav(-1)}
        />
        <Content className="space-y-8">
          <Field data-invalid={error}>
            <FieldLabel>Recipient</FieldLabel>
            <Textarea
              value={payload}
              onChange={changePayload}
              placeholder="Paste Swap String"
              className="min-h-[52px] resize-y rounded-3xl"
            />
            {
              error ? (<FieldError>Invalid Swap</FieldError>) : null
            }
          </Field>
          <div>
            <Button
              type="button"
              size="lg"
              variant="white"
              className="w-full rounded-full"
              disabled={payload === '' || contractsQuery.isPending}
              onClick={decodeSwap}
            >
              Accept
            </Button>
          </div>
        </Content>
      </ContentWrapper>

      {
        showAcceptDialog ? (
          <AcceptDialog
            swapString={payload}
            contract={contract}
            data={decodedSwap}
            onClose={() => setShowAcceptDialog(false)}
            onSuccess={() => {
              setPayload('');
              setDecodedSwap(null);
              setContract(null);
            }}
          />
        ) : null
      }
    </>
  )
}

function AcceptDialog(props: {
  swapString: string,
  contract: RgbContractDto | null,
  data: SwapInfo | null,
  onClose: () => void
  onSuccess: () => void
}) {
  const { swapString, data } = props
  const { currentContext } = useContextStore()
  const nodeId = currentContext?.node_id ?? ''

  const nodeswapAccept = useNodeSwapAcceptMutation(nodeId, props.swapString);

  const acceptSwap = async () => {
    try {
      await nodeswapAccept.mutateAsync({ nodeId, swapString });
      toast.success('Swap transaction accepted successfully.')
      props.onClose()
      props.onSuccess()
    } catch(e) {
      toast.error(errorToText(e))
    }
  }

  const isMaker = data?.role === 'Maker'
  const makerGivesRgb = data?.maker_gives_rgb
  const precision = props.contract?.precision ?? 0

  const sendAsset = isMaker && makerGivesRgb ?
    props.contract?.name :
    'BTC'
  const sendAmount = sendAsset === 'BTC' ?
    (BigInt(data?.btc_amount_msat || 0) / BigInt(1000)).toString() :
    formatNumber(data?.asset_amount || 0, precision)
  const sendUnit = sendAsset === 'BTC' ? 'sats' : props.contract?.name

  const receiveAsset = sendAsset === 'BTC' ? props.contract?.name : 'BTC'
  const receiveAmount = sendAsset === 'BTC' ?
    formatNumber(data?.asset_amount || 0, precision) :
    (BigInt(data?.btc_amount_msat || 0) / BigInt(1000)).toString()
  const receiveUnit = receiveAsset === 'BTC' ? 'sats' : props.contract?.name

  return (
    <Dialog
      open
      onOpenChange={props.onClose}
    >
      <DialogContent className="w-[560px]">
        <DialogHeader>
          <DialogTitle>{isMaker ? 'Send' : 'Receive'} Details</DialogTitle>
        </DialogHeader>
        <div className="relative flex justify-between items-center">
          <div>
            <label className="text-xs text-secondary-foreground">Send</label>
            <div className="mt-2 leading-10">
              <span className="text-[34px] font-bold">{sendAmount}</span>
              <span className="text-xl font-bold ml-1">{sendUnit}</span>
            </div>
          </div>
          <div>
            <AssetAvatar
              className="w-10 h-10"
              name={sendAsset ?? ''}
            />
          </div>
        </div>
        <div className="relative flex justify-between items-center">
          <div>
            <label className="text-xs text-secondary-foreground">Receive</label>
            <div className="mt-2 leading-10">
              <span className="text-[34px] font-bold">{receiveAmount}</span>
              <span className="text-xl font-bold ml-1">{receiveUnit}</span>
            </div>
          </div>
          <div>
            <AssetAvatar
              className="w-10 h-10"
              name={receiveAsset ?? ''}
            />
          </div>
        </div>

        <div className="bg-background-3 rounded-3xl px-4 py-4 space-y-4">
          <Row
            label="Payment ID"
            value={
              <div>
                <CopyTextInline buttonClassName="text-secondary-foreground" text={props.data?.payment_hash ?? ''} />
              </div>
            }
          />
          <Row
            label="BTC carrier"
            value={
              <div>
                {BigInt(props.data?.btc_carrier_amount_msat || 0) / BigInt(1000)} sats
              </div>
            }
          />
          <Row
            label="Timestamp"
            value={
              <div>
                {new Date(Number(data?.created_at_unix_secs || '0') * 1000).toLocaleString()}
              </div>
            }
          />
          <Row
            label="Status"
            value={
              <div>
                {data?.status ?? ''}
              </div>
            }
          />
        </div>
        <DialogFooter>
          <Button
            variant="white"
            size="lg"
            className="rounded-full flex-1"
            loading={nodeswapAccept.isPending}
            onClick={acceptSwap}
          >Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
