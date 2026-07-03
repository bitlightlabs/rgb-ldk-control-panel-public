import { Spinner } from "@/components/ui/spinner";

export default function Mask() {
  return (
    <div className="absolute inset-0 z-1000 bg-background/70 flex justify-center items-center">
      <Spinner style={{width: '28px', height: '28px'}} />
    </div>
  )
}
