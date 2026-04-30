import { Button } from "@/components/ui/button"
import { node_rgb_utxos_summary } from "@/lib/commands"
import { RefreshCw } from "lucide-react"

export default function ListUtxo(props: {nodeId: string}) {
  const loadUtxos = async () => {
    try {
      if(!props.nodeId) return

      const data = await node_rgb_utxos_summary(props.nodeId)
      console.log(data)
    } catch(e) {}
  }


  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={loadUtxos}
      className="h-7 w-7"
    >
      <RefreshCw />
    </Button>
  )
}
