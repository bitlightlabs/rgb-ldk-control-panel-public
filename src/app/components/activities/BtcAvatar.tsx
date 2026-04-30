import IconBtc from "@/app/icons/btc";
import IconIn from "@/app/icons/in";
import IconOut from "@/app/icons/out";

export default function BtcAvatar(props: {type: "Inbound" | "Outbound"}) {
  return (
    <div className="relative w-10 h-10">
      <IconBtc width={40} height={40} />
      {
        props.type === 'Inbound' ? (
          <IconIn className="absolute bottom-0 right-0" />
        ) : (
          <IconOut className="absolute bottom-0 right-0" />
        )
      }
    </div>
  )
}
