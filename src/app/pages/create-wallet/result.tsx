import { useNavigate } from "react-router-dom";
import { useSetupStore } from "@/app/stores/setupStore";
import Wrapper from "../start/components/Wrapper";
import { Field } from "@/components/ui/field";
import { PasswordSpan } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CopyButton from "@/app/components/CopyButton";
import IconFileLock from "@/app/icons/filelock";

export function CreateResult() {
  const nav = useNavigate();
  const mnemonic = useSetupStore((s) => s.mnemonic);

  const next = () => {
    nav("/dashboard", { replace: true });
  };

  const split = mnemonic.trim().split(" ");

  return (
    <Wrapper onBack={() => nav(-1)}>
      <div className="flex items-center justify-center w-[56px] h-[56px] mx-auto bg-background-3 rounded-2xl">
        <IconFileLock />
      </div>
      <h4 className="mt-5 text-xl text-center font-bold">
        Backup Recovery Phrase
      </h4>
      <div className="mt-2 text-base text-secondary-foreground text-center">
        Save your recovery phrase in a secure location. This is the only way to
        recover your wallet if you lose access.
      </div>
      <div className="mt-8 grid grid-cols-3 gap-4">
        {split.map((v, i) => {
          return (
            <Field key={v}>
              <PasswordSpan
                value={v}
                className="h-10 bg-background-4 disabled:opacity-100"
                prefix={i + 1}
                disabled
              />
            </Field>
          );
        })}
      </div>
      <div className="mt-8 flex gap-3">
        <CopyButton
          className="w-[120px]"
          value={mnemonic}
        />
        <Button
          size="lg"
          variant="white"
          className="flex-1 rounded-full"
          onClick={next}
        >
          Saved Recovery Phrases & Enter Wallet
        </Button>
      </div>
    </Wrapper>
  )
}
