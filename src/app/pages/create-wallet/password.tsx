import { useNavigate } from "react-router-dom";
import { PasswordForm } from "../start/components/PasswordForm";
import { useSetupStore } from "@/app/stores/setupStore";
import {
  walletNewMnemonicCli,
  hashPassword,
} from "@/lib/commands";
import { LDK_IMAGE } from "@/app/config/constant";
import { toast } from "sonner";
import { useState } from "react";
import { errorToText } from "@/lib/errorToText";
import { getNetworkOption } from "@/app/config/networkOptions";

export function CreatePassword() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const network = useSetupStore((s) => s.network);
  const setMnemonic = useSetupStore((s) => s.setMnemonic);
  const setPasswordHash = useSetupStore((s) => s.setPasswordHash);

  const next = async (password: string) => {
    const option = getNetworkOption(network);
    if (!option) {
      return;
    }

    try {
      setLoading(true);
      // hashPassword and walletNewMnemonicCli are independent — run in parallel
      const [hash, { mnemonic }] = await Promise.all([
        hashPassword(password),
        walletNewMnemonicCli(LDK_IMAGE),
      ]);

      setPasswordHash(hash);
      setMnemonic(mnemonic);
      nav("/create-wallet/setup", { replace: true });
    } catch (e) {
      toast.error(errorToText(e));
    } finally {
      setLoading(false);
    }
  };

  return <PasswordForm loading={loading} onNext={next} />;
}
