import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { node_rgb_utxos_summary } from "@/lib/commands"
import { useEffect, useState } from "react"
import { useNodeStore } from "../stores/nodeStore";

export default function RgbUtxoSelect(props: {onChangeUtxo: (utxo: string) => void}) {
  const [utxos, setUtxos] = useState<{outpoint: string, value_sats: number}[]>([])
  const activeNodeId = useNodeStore((s) => s.activeNodeId);

  const loadUtxos = async () => {
    try {
      if(!activeNodeId) return

      const data = await node_rgb_utxos_summary(activeNodeId)
      setUtxos(data.utxos)
    } catch(e) {}
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
          utxos.length === 0 ? (
            <SelectItem value="null" disabled>loading...</SelectItem>
          ) : utxos.map((c) => {
            return <SelectItem key={c.outpoint} value={c.outpoint}>{c.outpoint}</SelectItem>
          })
        }
      </SelectContent>
    </Select>
  )
}
