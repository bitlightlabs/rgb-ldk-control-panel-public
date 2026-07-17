import EmptyChannel from "@/app/components/EmptyChannel";
import { useNodeMainChannelsQuery } from "@/app/queries";
import { useContextStore } from "@/app/stores/contextStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ChannelDetailsExtendedDto } from "@/lib/sdk";
import { formatAddress } from "@/lib/utils";

interface IProps {
  onChange: (value: ChannelDetailsExtendedDto) => void;
}
export default function ChannelSelect(props: IProps) {
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  const change = (v: string) => {
    if(list.length === 0) {
      return
    }

    const channel = list.find((c) => c.user_channel_id === v);
    if(!channel) {
      return
    }

    props.onChange(channel);
  }

  const channelsQuery = useNodeMainChannelsQuery(activeNodeId, {
    refetchInterval: false,
  });

  const list = channelsQuery.data ?? [];

  return (
    <Select onValueChange={change}>
      <SelectTrigger className="h-13 rounded-2xl bg-background-4">
        <SelectValue placeholder="Select Channel" />
      </SelectTrigger>
      <SelectContent>
        {
          list.map((c) => (
            <SelectItem
              key={c.channel_id}
              value={c.user_channel_id}
            >
              Pubkey: {formatAddress(c.user_channel_id)}
            </SelectItem>
          ))
        }
        {
          list.length === 0 ? (
            <EmptyChannel />
          ) : null
        }
      </SelectContent>
    </Select>
  )
}
