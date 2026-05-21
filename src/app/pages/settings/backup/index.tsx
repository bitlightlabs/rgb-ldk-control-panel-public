import CheckButton from "@/app/components/CheckButton";
import { ContentHeader } from "@/app/components/ContentWrapper";
import CopyButton from "@/app/components/CopyButton";
import WordPanel from "@/app/components/WordPanel";
import IconCircle, { IconCircleOn } from "@/app/icons/circle";
import IconSuccess from "@/app/icons/success";
import { useContextStore } from "@/app/stores/contextStore";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/input";
import {
  backupExportCli,
  nodeLock,
  nodeUnlock,
  verifyPassword,
  walletShowMnemonicCli,
  type WalletShowMnemonicResponse,
} from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import {
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { save } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { toast } from "sonner";

export default function Backup() {
  const [step, setStep] = useState<number>(1);
  const currentContext = useContextStore((s) => s.currentContext);

  // Lift the mnemonic query here so it can be started alongside verifyPassword
  // instead of waiting until BackupDetail mounts (which would be sequential).
  const queryMnemonic = useQuery({
    queryKey: ["mnemonic", currentContext?.node_id],
    queryFn: async () => {
      console.log("queryMnemonic", Date.now());
      const mnemonic = await walletShowMnemonicCli(
        currentContext!.node_id,
        true
      );
      console.log("queryMnemonic result", mnemonic, Date.now());
      return mnemonic;
    },
    enabled: false, // triggered manually on verify click
    staleTime: Infinity,
    retry: false,
  });

  if (step === 1) {
    return (
      <BackupHome
        onNext={() => setStep(2)}
        onStartMnemonicFetch={() => queryMnemonic.refetch()}
      />
    );
  }

  return (
    <BackupDetail onBack={() => setStep(1)} mnemonicQuery={queryMnemonic} />
  );
}

function BackupHome(props: {
  onNext: () => void;
  onStartMnemonicFetch: () => void;
}) {
  const currentContext = useContextStore((s) => s.currentContext);
  const [pwd, setPwd] = useState<string>("");
  const [verifying, setVerifying] = useState(false);

  const verify = async () => {
    if (!currentContext) {
      return;
    }

    try {
      // Start walletShowMnemonicCli (docker run, ~30s) alongside verifyPassword
      // (~4.5s PBKDF2) so both run in parallel. BackupDetail will read from
      // the already-in-flight query instead of waiting an extra 30s.
      props.onStartMnemonicFetch();
      setVerifying(true);
      const ok = await verifyPassword(pwd, currentContext.password_hash);
      setVerifying(false);
      if (!ok) {
        toast.error("Incorrect Passwords");
        return;
      }
      props.onNext();
    } catch (e) {}
  };

  return (
    <div className="w-full">
      <h4 className="text-[22px] leading-7 font-bold">Backup</h4>
      <div className="mt-3 text-base text-secondary-foreground">
        Backup files and recovery phrases are used to restore your wallet.
        Please keep them strictly confidential. Password verification is
        required before proceeding.
      </div>
      <Alert variant="destructive" className="mt-3">
        <AlertDescription className="text-secondary-foreground">
          <div>
            Please do not share your backup file or recovery phrase,
            and do not store them on untrusted devices or cloud services.
          </div>
          <div className="mt-2">
            Both the recovery phrase and the backup file are required to restore your wallet.
          </div>
          <div className="mt-2">
            If either is lost, or if the password is forgotten, wallet recovery
            will not be possible
          </div>
        </AlertDescription>
      </Alert>
      <Field className="mt-8">
        {/* onFocus starts the Docker fetch in the background while the user
            types, so the mnemonic is ready (or near-ready) by submit time. */}
        <PasswordInput
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Enter your password"
          value={pwd}
          onFocus={props.onStartMnemonicFetch}
        />
      </Field>
      <Field className="mt-8">
        <Button
          size="lg"
          variant="white"
          className="w-full rounded-full"
          disabled={!pwd}
          loading={verifying}
          onClick={verify}
        >
          Verify & Continue
        </Button>
      </Field>
    </div>
  );
}

function BackupDetail(props: {
  onBack: () => void;
  mnemonicQuery: UseQueryResult<WalletShowMnemonicResponse>;
}) {
  const [checked, setChecked] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [step, setStep] = useState<"words" | "file" | "done">("words");
  const [step1Done, setStep1Done] = useState(false);
  const [step2Done, setStep2Done] = useState(false);
  const currentContext = useContextStore((s) => s.currentContext);

  const queryMnemonic = props.mnemonicQuery;
  const queryClient = useQueryClient();

  const next = () => {
    setStep("file");
    setStep1Done(true);
    // Clear mnemonic from cache once the user confirms they've saved it
    queryClient.removeQueries({ queryKey: ["mnemonic"] });
  };

  const download = async () => {
    if (!currentContext) {
      return;
    }

    try {
      setDownloading(true);
      // Save path
      const path = await save({
        defaultPath: `backup-${currentContext.display_name}.tar`,
      });

      if (!path) {
        return;
      }

      // 1. Lock node
      await nodeLock(currentContext.node_id);
      // 2. Export
      await backupExportCli(currentContext.node_id, path);
      // 3. Unlock
      await nodeUnlock(currentContext.node_id);

      setStep("done");
      setStep2Done(true);
    } catch (e) {
      toast.error(errorToText(e));
    } finally {
      setDownloading(false);
    }
  };

  const data = queryMnemonic.data;

  if (step === "words") {
    return (
      <div>
        <ContentHeader title="Backup Wallet" onBack={props.onBack} />
        <div className="flex gap-3">
          <div className="mt-10">
            <Indicator />
          </div>
          <div>
            <div className="mt-4 flex-1 bg-background-4 rounded-3xl p-5">
              <h4 className="text-lg font-medium">
                Write Down Recovery Phrase
              </h4>
              <div className="mt-2 text-base text-secondary-foreground">
                Write down these words and keep them in a safe, offline place.
                Do not share them with anyone.
              </div>
              <div className="mt-3">
                <WordPanel
                  loading={queryMnemonic.isFetching}
                  words={data?.mnemonic ?? ""}
                />
              </div>
              <div className="mt-6 flex gap-3">
                <div className="pt-1">
                  <CheckButton onChange={setChecked} />
                </div>
                <div className="text-base">
                  I've backed up my recovery phrase to my wallet in a private
                  and secure place
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Button
                  size="lg"
                  variant="white"
                  className="flex-1 rounded-full"
                  disabled={!checked || queryMnemonic.isFetching}
                  loading={queryMnemonic.isFetching}
                  onClick={next}
                >
                  I've Saved the Phrases
                </Button>
                <CopyButton
                  value={data?.mnemonic ?? ""}
                  className="w-[106px]"
                />
              </div>
            </div>
            <div className="mt-6 text-lg font-medium text-secondary-foreground">
              Download Backup File
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "file") {
    return (
      <div>
        <ContentHeader title="Backup Wallet" onBack={props.onBack} />
        <div className="flex gap-3">
          <div className="mt-10 h-[100px]">
            <Indicator step1Done={step1Done} step2Done={step2Done} />
          </div>
          <div className="pt-9">
            <h4 className="text-lg font-medium text-secondary-foreground">
              Recovery Phrase Backed Up
            </h4>
            <div className="mt-8 flex-1 bg-background-4 rounded-3xl p-5">
              <div className="text-base font-medium">Download Backup File</div>
              <div className="mt-2 text-base text-secondary-foreground">
                This encrypted file contains your node data and channel states.
                Download it and store it securely.
              </div>
              <div className="mt-6">
                <Button
                  size="lg"
                  variant="white"
                  className="s-full rounded-full"
                  disabled={downloading}
                  loading={downloading}
                  onClick={download}
                >
                  Download Backup File
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ContentHeader title="Backup Wallet" onBack={props.onBack} />
      <div className="flex gap-3">
        <div className="mt-10 h-[80px]">
          <Indicator step1Done={step1Done} step2Done={step2Done} />
        </div>
        <div className="pt-9">
          <h4 className="text-lg font-medium text-secondary-foreground">
            Recovery Phrase Backed Up
          </h4>
          <h4 className="mt-8 text-lg font-medium text-secondary-foreground">
            Backup File Downloaded
          </h4>
          <Alert className="mt-8" variant="success">
            <AlertDescription icon="success">
              <h4 className="text-base font-medium">Backup Successful!</h4>
              <div className="mt-2 text-base text-secondary-foreground">
                Please ensure your recovery phrase and backup file are stored in
                separate, secure locations.
              </div>
            </AlertDescription>
          </Alert>
          <div className="mt-8 flex gap-3">
            <Button
              size="lg"
              variant="white"
              className="w-full rounded-full"
              disabled={!checked}
              onClick={props.onBack}
            >
              Finish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Indicator(props: { step1Done?: boolean; step2Done?: boolean }) {
  const { step1Done = false, step2Done = false } = props;
  return (
    <div className="relative w-5 h-full">
      {step1Done ? <IconSuccess className="w-5 h-5" /> : <IconCircleOn />}
      <span
        className="absolute left-[10px] h-[calc(100%-30px)] w-[1px] border-l-[1px] border-dashed border-muted-foreground"
        style={{
          borderColor: step1Done ? "var(--success)" : "var(--muted-foreground)",
        }}
      />
      {!step1Done ? (
        <IconCircle className="absolute bottom-[3px] left-0 bg-background" />
      ) : step2Done ? (
        <IconSuccess className="absolute bottom-[3px] left-0 w-5 h-5 bg-background" />
      ) : (
        <IconCircleOn className="absolute bottom-[3px] left-0 bg-background" />
      )}
    </div>
  );
}
