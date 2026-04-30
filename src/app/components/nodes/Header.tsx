import type { NodeContext } from "@/lib/domain";
import { useNodeStore } from "@/app/stores/nodeStore";
import { Button } from "@/components/ui/button";
import IconPlus from "@/app/icons/IconPlus";

interface IProps {
  contexts: NodeContext[]
  onCreateNode: () => void
}
export default function Header(props: IProps) {
  // const { contexts = [] } = props
  // const activeNodeId = useNodeStore((s) => s.activeNodeId);

  // const currentNode = contexts.find(c => c.node_id === activeNodeId);

  return (
    <div className="h-9 flex justify-between items-center ">
      <h4 className="text-[22px] font-bold">Node</h4>
      <div>
        <Button
          variant="white"
          className="w-[150px] rounded-full"
          onClick={props.onCreateNode}
        >
          <IconPlus style={{width: '20px', height: '20px'}} />
          <span>Create Node</span>
        </Button>
      </div>
    </div>
  )
}
