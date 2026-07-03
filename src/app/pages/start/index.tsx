import { useContextsRemoveMutation } from "@/app/mutations";
import { useContextsQuery } from "@/app/queries";
import { useState } from "react";
import Welcome from "./components/Welcome";
import Local from "./components/Local";
import DeleteNodeDialog from "./components/DeleteNodeDialog";
import SwitchNodeDialog from "./components/SwitchNodeDialog";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";
import JsonData from '@/../package.json'
import Account from "./components/Account";

export default function Start() {
  const [deleteNodeId, setDeleteNodeId] = useState<string>("")
  const [page, setPage] = useState<"welcome" | "local" | "remote">("welcome")
  const [showSwitchNode, setShowSwitchNode] = useState('')

  const contextsQuery = useContextsQuery({
    refetchInterval: false,
  });

  const deleteNodeMutation = useContextsRemoveMutation();

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
          <div className="w-[260px] absolute inset-2 bg-background-2 pt-4 px-3 rounded-3xl border border-background-2">
            <div className="text-2xs leading-4 text-secondary-foreground">
              QUICK LAUNCH
            </div>
            <div className="mt-8">
              <h2 className="text-base font-medium">Recent Nodes</h2>
            </div>

            {contexts.length > 0 ? (
              <div className="mt-3 mb-10">
                {contexts.map((v) => {
                  return (
                    <Account
                      key={v.node_id}
                      context={v}
                      onSwitchNode={setShowSwitchNode}
                      onDeleteNode={setDeleteNodeId}
                    />
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

            <div
              className="leading-[18px] absolute left-0 bottom-4 right-0 text-xs text-center text-secondary-foreground"
            >
              v{JsonData.version}
            </div>
          </div>
          <div className="h-full ml-[268px]">
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
      {showSwitchNode ? (
        <SwitchNodeDialog
          contexts={contexts}
          nodeId={showSwitchNode}
          onClose={() => setShowSwitchNode('')}
        />
      ) : null}
    </>
  )
}
