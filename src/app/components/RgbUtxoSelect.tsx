import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { node_rgb_utxos_summary } from "@/lib/commands"
import { useEffect, useState } from "react"

export default function RgbUtxoSelect(props: {nodeId: string, onChangeUtxo: (utxo: string) => void}) {
  const [utxos, setUtxos] = useState<{outpoint: string, value_sats: number}[]>([])

  const loadUtxos = async () => {
    try {
      if(!props.nodeId) return

      const data = await node_rgb_utxos_summary(props.nodeId)
      setUtxos(data.utxos)
    } catch(e) {}
  }

  useEffect(() => {
    loadUtxos()
  }, [props.nodeId])

  return (
    <Select onValueChange={(v) => props.onChangeUtxo(v)}>
      <SelectTrigger className="w-full">
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
