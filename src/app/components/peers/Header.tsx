import { Button } from "@/components/ui/button";
import IconPlus from "@/app/icons/IconPlus";

interface IProps {
  onCreateNode: () => void
}
export default function Header(props: IProps) {
  return (
    <div className="sticky top-0 z-40 flex h-[68px] justify-between items-center ">
      <h4 className="text-[22px] font-bold ml-2">Node</h4>
      <div>
        <Button
          variant="white"
          className="w-[150px] rounded-full"
          onClick={props.onCreateNode}
        >
          <IconPlus style={{width: '20px', height: '20px'}} />
          <span>Connect Node</span>
        </Button>
      </div>
    </div>
  )
}
