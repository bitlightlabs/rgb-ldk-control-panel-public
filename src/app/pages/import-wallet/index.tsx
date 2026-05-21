import { useNavigate } from "react-router-dom";
import { PasswordForm } from "../start/components/PasswordForm";
import { useSetupStore } from "@/app/stores/setupStore";
import Crypto from "@/lib/crypto";
import { toast } from "sonner";
import { useState } from "react";
import { errorToText } from "@/lib/errorToText";

export default function CreatePassword() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)
  const setPasswordHash = useSetupStore((s) => s.setPasswordHash)

  const next = async (password: string) => {
    try {
      setLoading(true)
      const hash = await Crypto.getInstance().hashString(password)
      setPasswordHash(hash)
      nav('/import-wallet/import', { replace: true })
    } catch(e) {
      toast.error(errorToText(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <PasswordForm
      loading={loading}
      onNext={next}
    />
  )
}
