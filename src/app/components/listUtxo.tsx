import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export default function ListUtxo(props: {nodeId: string}) {
  const loadUtxos = async () => {
    try {
      if(!props.nodeId) return
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
