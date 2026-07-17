import IconTriangleDown from "../icons/triangle";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CopyText from "./CopyText";
import { useEffect, useState } from "react";
import AssetAvatar from "./AssetAvatar";
import { useNodeRgbContractsQuery } from "../queries";
import { useContextStore } from "../stores/contextStore";
import type { RgbContractDto } from "@/lib/sdk/types";
import { formatAddress } from "@/lib/utils";


interface CustomAssetSelectProps {
  title: string
  channelContractId: string
  defaultShowBtc?: boolean
  value: RgbContractDto | null
  onChange?: (data: RgbContractDto) => void;
}

const BTC = {
  name: 'BTC',
  ticker: 'BTC',
  contract_id: '',
  precision: 9,
  issued_supply: '',
  details: ''
}
export function ChannelAssetSelect(props: CustomAssetSelectProps) {
  const { title, defaultShowBtc = false, value = null } = props;
  const [showSelect, setShowSelect] = useState(false);
  const [list, setList] = useState<RgbContractDto[]>([]);

  const { currentContext } = useContextStore();
  const activeNodeId = currentContext?.node_id;

  const rgbContractsQuery = useNodeRgbContractsQuery(activeNodeId, {
    staleTime: 30_000,
    enabled: false
  });

  const init = async (nodeId?: string, contractId?: string) => {
    if(!nodeId || !contractId) {
      return
    }

    try {
      const json = await rgbContractsQuery.refetch();
      const list = json.data?.contracts ?? [];

      const channelAsset = list.find(item => item.contract_id === contractId);

      if(channelAsset) {
        setList([channelAsset]);
      }

      // let asset: RgbContractDto = BTC;
      // if(list.length > 0 && !defaultShowBtc) {
      //   asset = list[0];
      // }
      // if(props.onChange) {
      //   props.onChange(asset);
      // }

    } catch(e) {}
  }

  useEffect(() => {
    init(activeNodeId, props.channelContractId)
  }, [activeNodeId, props.channelContractId])

  const change = (v: RgbContractDto) => {
    setShowSelect(false);

    if(props.onChange) {
      props.onChange(v);
    }
  }

  return (
    <div>
      <button
        className="h-[30px] rounded-full px-1 py-1 bg-background-3 gap-1 border border-input"
        onClick={() => setShowSelect(true)}
      >
        <div className="flex gap-1 items-center">
          {
            value ? (
              <>
                <AssetAvatar className="w-5 h-5" name={value?.name ?? ''} />
                <span className="text-xs">{value?.name ?? ''}</span>
              </>
            ) : (
              <span className="text-xs pl-1">Select Token</span>
            )
          }
          <IconTriangleDown />
        </div>
      </button>

      <Dialog
        open={showSelect}
        onOpenChange={() => setShowSelect(false)}
      >
        <DialogContent className="w-[560px] px-2">
          <DialogHeader className="px-3">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <AssetItem
              data={BTC}
              onSelect={change}
            />
            {list.map(item => (
              <AssetItem
                key={item.name}
                data={item}
                onSelect={change}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AssetItem(props: {data: RgbContractDto, onSelect: (data: RgbContractDto) => void}) {
  const { data } = props;

  const pickAsset = () => {
    props.onSelect(data);
  }

  return (
    <div
      className="h-16 px-3 rounded-2xl flex justify-between items-center hover:bg-background-3"
      onClick={pickAsset}
    >
      <div className="h-10 flex gap-3">
        <AssetAvatar className="w-10 h-10" name={data.name ?? ''} />
        <div className="flex flex-col justify-center">
          <h4 className="text-base font-medium leading-5">{data.name}</h4>
          {
            data.contract_id ? (
              <div className="mt-0.5 text-xs text-secondary-foreground flex h-5 items-center gap-2">
                <span>{formatAddress(data.contract_id)}</span>
                <CopyText text={data.contract_id} />
              </div>
            ) : null
          }
        </div>
      </div>
      {/* <Button
        variant="default"
        className="h-7 px-2.5 rounded-full text-xs"
      >Import</Button> */}
    </div>
  )
}
