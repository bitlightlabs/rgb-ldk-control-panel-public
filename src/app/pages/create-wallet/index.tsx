import Wrapper from "../start/components/Wrapper";
import { useNavigate } from "react-router-dom";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BoxIcon } from "lucide-react";
import NetworkSwitch from "@/app/components/NetworkSwitch";
import { useEffect, useState } from "react";
import { contextsList } from "@/lib/commands";
import { useSetupStore } from "@/app/stores/setupStore";
import { LDK_IMAGE } from "@/app/config/constant";
import { ensureDockerImage } from "@/lib/docker";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";

export function CreateWallet() {
  const nav = useNavigate()
  const [checking, setChecking] = useState(false)
  const network = useSetupStore((s) => s.network)
  const accountName = useSetupStore((s) => s.accountName)
  const setNetwork = useSetupStore((s) => s.setNetwork)
  const setAccountName = useSetupStore((s) => s.setAccountName)

  const initName = async () => {
    try {
      const list = await contextsList()
      setAccountName(`Node ${list.length + 1}`)
    } catch(e) {
      console.error(e)
    }
  }

  const changeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccountName(e.target.value)
  }

  const next = async () => {
    try {
      setChecking(true)
      await ensureDockerImage(LDK_IMAGE)
      nav('/create-wallet/password')
    } catch(e) {
      toast.error(errorToText(e))
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    initName()
  }, [])

  return (
    <Wrapper onBack={() => nav(-1)}>
      <div className="flex items-center justify-center w-[56px] h-[56px] mx-auto bg-background-3 rounded-2xl">
        <BoxIcon />
      </div>
      <h4 className="mt-5 text-xl text-center font-bold">New Node Setup</h4>
      <div className="mt-2 text-base text-secondary-foreground text-center">
        Configure your node settings to create a new RGB Lightning wallet. Choose a name and network for your wallet.
      </div>
      <Field className="mt-8">
        <FieldLabel>Node Name (Optional)</FieldLabel>
        <Input
          value={accountName}
          placeholder="Account Name"
          maxLength={12}
          className="bg-background-4"
          onChange={changeName}
        />
      </Field>
      <Field className="mt-8">
        <FieldLabel>Network</FieldLabel>
        <NetworkSwitch
          value={network}
          onSelect={setNetwork}
        />
      </Field>

      <Field className="mt-8">
        <Button
          size="lg"
          variant="white"
          className="w-full rounded-full"
          loading={checking}
          disabled={!accountName || checking}
          onClick={next}
        >Continue</Button>
      </Field>
    </Wrapper>
  )
}
