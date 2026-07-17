import { useNavigate } from "react-router-dom";
import Wrapper from "../start/components/Wrapper";
import IconFileLock from "@/app/icons/filelock";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import IconFolder from "@/app/icons/folder";
import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import {
  useBackupImportCliMutation,
  useBackupInspectArchiveCliMutation,
  useEventsStartMutation,
  useNodeRunCliMutation,
  useNodeUnlockMutation,
  usePrepareNodeResourcesMutation,
  useWalletInitCliMutation,
} from "@/app/mutations";
import { LDK_IMAGE } from "@/app/config/constant";
import { getNetworkOption } from "@/app/config/networkOptions";
import type { BitcoinNetwork } from "@/lib/domain";
import { useSetupStore } from "@/app/stores/setupStore";
import { toast } from "sonner";
import { errorToText } from "@/lib/errorToText";
import { ensureDockerImage } from "@/lib/docker";
import { useContextStore } from "@/app/stores/contextStore";

export default function ImportWallet() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filePath, setFilePath] = useState<string>("");
  const [words, setWords] = useState<string>("");
  const passwordHash = useSetupStore((s) => s.passwordHash);
  const [name, setName] = useState<string>("");
  const setCurrentContext = useContextStore((s) => s.setCurrentContext)

  const prepareNodeMutation = usePrepareNodeResourcesMutation();
  const initNodeMutation = useWalletInitCliMutation();
  const importMutation = useBackupImportCliMutation();
  const inspectMutation = useBackupInspectArchiveCliMutation();
  const nodeRunMutation = useNodeRunCliMutation();
  const unlockNodeMutation = useNodeUnlockMutation();
  const eventsStartMutation = useEventsStartMutation();

  const selectFile = async () => {
    const selected = await open({
      multiple: false,
    });
    if (selected) {
      setFilePath(selected);
    }
  };

  const pasteText = async () => {
    try {
      const text = await readText();
      setWords(text);
    } catch (e) {
      console.log(e);
    }
  };

  const restore = async () => {
    // Check mnemonic words count
    const wordsCount = words.trim().split(" ").length;
    if (wordsCount !== 12 && wordsCount !== 24) {
      toast.error("Invalid recovery phrase.");
      return;
    }

    try {
      setLoading(true);

      setProgress(0);

      // Check dockeer
      await ensureDockerImage(LDK_IMAGE);

      // 1. Inspect file
      const inspectData = await inspectMutation.mutateAsync({
        image: LDK_IMAGE,
        archivePath: filePath,
      })
      const network = inspectData.manifest.network as BitcoinNetwork
      setProgress(20);

      const option = getNetworkOption(network);
      if (!option) {
        throw new Error(`Unsupported network: ${network}`);
      }

      // 2. Prepare
      const context = await prepareNodeMutation.mutateAsync({
        passwordHash: passwordHash,
        ldkImage: LDK_IMAGE,
        nodeName: name === '' ? undefined : name, // Optional
        network,
        esploraUrl: option.esploraUrl,
      });
      setCurrentContext(context);
      setProgress(40);

      // 3. Init Node
      await initNodeMutation.mutateAsync({
        nodeId: context.node_id,
        mnemonic: words,
        image: LDK_IMAGE,
      });
      setProgress(60);

      // 4. Import
      await importMutation.mutateAsync({
        nodeId: context.node_id,
        archivePath: filePath,
        autoStop: false,
      });
      setProgress(80);

      // 5. Run node
      await nodeRunMutation.mutateAsync({ nodeId: context.node_id });
      setProgress(90);

      // 6. Unlock node
      // Delay a bit to make sure the node is up and running, otherwise the unlock command may fail
      await new Promise((res) => setTimeout(res, 5000));
      await unlockNodeMutation.mutateAsync(context.node_id);
      await eventsStartMutation.mutateAsync(context.node_id);

      // Nav to start page
      nav("/dashboard", { replace: true });
    } catch (e) {
      toast.error(errorToText(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrapper onBack={() => nav(-1)}>
      {
        loading ? <div className="absolute z-10 inset-0 bg-transparent" /> : null
      }

      <div className="flex items-center justify-center w-[56px] h-[56px] mx-auto bg-background-3 rounded-2xl">
        <IconFileLock />
      </div>
      <h4 className="mt-5 text-xl text-center font-bold">Restore Wallet</h4>
      <div className="mt-2 text-base text-secondary-foreground text-center">
        Regain access to your wallet using your backup file and recovery phrase
      </div>

      <Field className="mt-8">
        <FieldLabel>Recovery Phrase</FieldLabel>
        <Textarea
          value={words}
          onChange={(e) => setWords(e.target.value)}
          placeholder="Enter 12 or 24-word recovery phrase"
          className="rounded-2xl min-h-[120px] pr-20 bg-background-4"
          slot={
            <Button
              variant="destructive"
              className="w-14 h-7 rounded-full text-sm"
              onClick={pasteText}
            >
              Paste
            </Button>
          }
        />
      </Field>
      <Field className="mt-8">
        <FieldLabel>Backup File</FieldLabel>
        <Input
          readOnly
          placeholder="Select your backup file"
          className="bg-background-4 focus-visible:ring-0 pr-[68px] whitespace-nowrap overflow-hidden text-ellipsis"
          value={filePath}
          onClick={selectFile}
          subfix={
            <Button
              variant="white"
              className="w-[52px] absolute top-0 right-0 h-full rounded-r-2xl"
              onClick={selectFile}
            >
              <IconFolder style={{ width: "20px", height: "20px" }} />
            </Button>
          }
        />
      </Field>
      <Field className="mt-8">
        <FieldLabel>Node Name</FieldLabel>
        <Input
          placeholder="Enter Node Name"
          className="bg-background-4"
          maxLength={12}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <div className="mt-8">
        <Button
          size="lg"
          variant="white"
          className="w-full rounded-full"
          disabled={loading || filePath === "" || words === ""}
          onClick={restore}
        >
          {
            loading ? `Importing... ${progress}%` : "Restore Wallet"
          }
        </Button>
      </div>
    </Wrapper>
  );
}
