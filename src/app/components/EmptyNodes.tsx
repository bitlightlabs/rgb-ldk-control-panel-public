import IconPlus from "@/app/icons/IconPlus"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

export default function EmptyNodes() {
  const nav = useNavigate()

  const connectNode = () => {
    nav('/dashboard/peers')
  }

  return (
    <div className="rounded-2xl px-5 py-5">
      <div className="text-base leading-5 text-center">No connected nodes found.</div>
      <div className="text-xs text-secondary-foreground mt-2 text-center">
        Please connect a node before opening a channel.
      </div>
      <div className="mt-4 flex justify-center">
        <Button
          size="lg"
          variant="destructive"
          className="rounded-full"
          onClick={connectNode}
        >
          <IconPlus />
          <span>Connect Node</span>
        </Button>
      </div>
    </div>
  )
}
