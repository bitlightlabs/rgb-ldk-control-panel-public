import { ActionHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import CreateUtxoDialog from "@/app/components/CreateUtxoDialog";
import UnlockUtxoDialog from "@/app/components/UnlockUtxoDialog";
import UtxoItem from "@/app/components/UtxoItem";
import IconPlus from "@/app/icons/IconPlus";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function UtxoPage() {
  const nav = useNavigate()
  const [showCreateUtxo, setShowCreateUtxo] = useState(false)
  const [showUnlockUtxo, setShowUnlockUtxo] = useState(false)

  return (
    <>
      <ContentWrapper className="w-full">
        <ActionHeader title="UTXO Management" onBack={() => nav('/dashboard')}>
          <Button
            variant="white"
            className="w-[150px] rounded-full"
            onClick={() => setShowCreateUtxo(true)}
          >
            <IconPlus style={{width: '20px', height: '20px'}} />
            <span>Create UTXO</span>
          </Button>
        </ActionHeader>
        <div className="mt-4 flex justify-between gap-3">
          <div data-role="left" className="flex-1 space-y-3">
            <UtxoItem onUnlock={() => setShowUnlockUtxo(true)} />
            <UtxoItem />
          </div>
          <div data-role="right" className="flex-1">
            <UtxoItem />
          </div>
        </div>
      </ContentWrapper>

      {/* Create UTXO */}
      {
        showCreateUtxo ? (
          <CreateUtxoDialog onClose={() => setShowCreateUtxo(false)} />
        ) : null
      }

      {/* Unlock utxo */}
      {
        showUnlockUtxo ? (
          <UnlockUtxoDialog onClose={() => setShowUnlockUtxo(false)} />
        ) : null
      }
    </>
  )
}

