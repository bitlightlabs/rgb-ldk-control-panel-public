import DropMenu from "@/app/components/DropMenu";
import IconDelete from "@/app/icons/delete";
import { contextsList, contextsRemove } from "@/lib/commands";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Welcome from "./components/Welcome";
import Local from "./components/Local";
import DeleteNodeDialog from "./components/DeleteNodeDialog";
import SwitchNodeDialog from "./components/SwitchNodeDialog";
import { useContextStore } from "@/app/stores/contextStore";
import NetworkMeta from "./components/NetworkMeta";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";

export default function Start() {
  const [showSwitchNode, setShowSwitchNode] = useState(false)
  const currentContext = useContextStore((s) => s.currentContext);
  const setCurrentContext = useContextStore((s) => s.setCurrentContext);
  const [deleteNodeId, setDeleteNodeId] = useState<string>("");
  const [page, setPage] = useState<"welcome" | "local" | "remote">("welcome")

  const contextsQuery = useQuery({
    queryKey: ["contexts"],
    queryFn: contextsList,
    refetchInterval: false,
  });

  const deleteNodeMutation = useMutation({
    mutationFn: (nodeId: string) => contextsRemove(nodeId),
  });

  const switchNode = (nodeId: string) => {
    const context = contextsQuery.data?.find((v) => v.node_id === nodeId);
    if(!context) return;

    setCurrentContext(context);
    setShowSwitchNode(true)
  }

  const deleteNode = async (nodeId: string) => {
    try {
      await deleteNodeMutation.mutateAsync(nodeId);
      setDeleteNodeId("");
      contextsQuery.refetch();
    } catch(e) {
      toast.error(errorToText(e))
    }
  }

  const renderContent = () => {
    if(page === 'welcome') {
      return <Welcome onLocal={() => setPage('local')} onRemote={() => {}} />
    }

    if(page === 'local') {
      return <Local onBack={() => setPage('welcome')} />
    }

    return null
  }

  const contexts = contextsQuery.data ?? []

  return (
    <>
      <div
        className="h-svh bg-background bg-bottom-right bg-no-repeat"
        style={{ backgroundImage: `url(./bg-bottom-1.png)` }}
      >
        <div className="h-full relative">
          <div className="w-[200px] absolute inset-2 bg-background-2 pt-4 px-3 rounded-3xl border border-background-2">
            <div className="text-2xs leading-4 text-secondary-foreground">
              QUICK LAUNCH
            </div>
            <div className="mt-8">
              <h2 className="text-base font-medium">Recent Nodes</h2>
            </div>

            {contexts.length > 0 ? (
              <div className="mt-3">
                {contexts.map((v) => {
                  return (
                    <div
                      key={v.node_id}
                      className="relative mb-2 p-3 bg-background-3 rounded-2xl cursor-pointer hover:bg-background-2"
                      role="button"
                      tabIndex={0}
                      onClick={() => switchNode(v.node_id)}
                    >
                      <div className="absolute right-[10px] top-[10px]">
                        <DropMenu
                          className="w-6 h-6"
                          direaction="vertical"
                          variant="ghost"
                          list={[
                            {
                              label: (
                                <span className="text-error">Delete Node</span>
                              ),
                              icon: (
                                <IconDelete
                                  className="text-error"
                                  style={{ width: "20px", height: "20px" }}
                                />
                              ),
                              data: v.node_id,
                              onClick: (id: string) => setDeleteNodeId(id),
                            },
                          ]}
                        />
                      </div>
                      <h4 className="text-base font-medium truncate pr-8">
                        {v.display_name}
                      </h4>
                      <NetworkMeta
                        network={v.network}
                        // todo ====== nodecontext add network type ======
                        type={"Local"}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}

            {contexts.length === 0 ? (
              <div className="mt-3 bg-background-3 p-3 rounded-2xl">
                <label className="text-base">No node found</label>
                <div className="mt-2 text-xs text-secondary-foreground">
                  Create a new node to get started with RGB Lightning Node
                </div>
              </div>
            ) : null}
          </div>
          <div className="h-full ml-[208px]">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Delete Node */}
      {deleteNodeId !== "" ? (
        <DeleteNodeDialog
          nodeId={deleteNodeId}
          contexts={contexts}
          onClose={() => setDeleteNodeId("")}
          pending={deleteNodeMutation.isPending}
          onSubmit={deleteNode}
        />
      ) : null}

      {/* Switch Node */}
      {showSwitchNode && currentContext ? (
        <SwitchNodeDialog
          context={currentContext}
          onClose={() => setShowSwitchNode(false)}
        />
      ) : null}
    </>
  )
}
