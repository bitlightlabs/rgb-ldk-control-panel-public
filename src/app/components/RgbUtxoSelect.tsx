import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"
import { useContextStore } from "../stores/contextStore";
import { classifyUtxos } from "@/lib/utils";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";

/**
 * One UTXO can only be bind to one RGB asset
 */
export default function RgbUtxoSelect(props: {onChangeUtxo: (utxo: string) => void}) {
  const [loading, setLoading] = useState(true)
  const [utxos, setUtxos] = useState<{outpoint: string, value_sats: string}[]>([])
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  const loadUtxos = async () => {
    if(!activeNodeId) return

    try {
      setLoading(true)

      const data = await classifyUtxos(activeNodeId)
      console.log('classifyUtxos', data)
      if(!data) {
        return
      }

      const available = data.available
      const utxos = []
      for(const k in available) {
        utxos.push({
          outpoint: k,
          value_sats: available[k]
        })
      }
      setUtxos(utxos)
    } catch(e) {
      toast.error(errorToText(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUtxos()
  }, [activeNodeId])

  return (
    <Select onValueChange={(v) => props.onChangeUtxo(v)}>
      <SelectTrigger className="h-13 rounded-2xl">
        <SelectValue placeholder="Select Utxo" />
      </SelectTrigger>
      <SelectContent>
        {
          loading ? (
            <SelectItem value="null" disabled>loading...</SelectItem>
          ) : utxos.map((c) => {
            return <SelectItem key={c.outpoint} value={c.outpoint}>{c.outpoint}</SelectItem>
          })
        }
      </SelectContent>
    </Select>
  )
}
