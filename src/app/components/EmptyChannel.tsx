import IconPlus from "@/app/icons/IconPlus"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

export default function EmptyChannel() {
  const nav = useNavigate()

  const connectNode = () => {
    nav('/dashboard/channels')
  }

  return (
    <div className="rounded-2xl px-5 py-5">
      <div className="text-base leading-5 text-center">No channels available.</div>
      <div className="text-xs text-secondary-foreground mt-2 text-center">
        Open a channel to start swapping assets.
      </div>
      <div className="mt-4 flex justify-center">
        <Button
          size="lg"
          variant="destructive"
          className="rounded-full"
          onClick={connectNode}
        >
          <IconPlus />
          <span>Open Channel</span>
        </Button>
      </div>
    </div>
  )
}
