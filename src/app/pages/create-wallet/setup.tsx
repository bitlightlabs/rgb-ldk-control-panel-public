import { LDK_IMAGE } from "@/app/config/constant";
import { getNetworkOption } from "@/app/config/networkOptions";
import { useContextStore } from "@/app/stores/contextStore";
import { useSetupStore } from "@/app/stores/setupStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  contextsRemove,
  dockerEnvironment,
  eventsStart,
  nodeRunCli,
  nodeUnlock,
  prepareNodeResources,
  walletInitCli,
} from "@/lib/commands";
import { DockerEnvironmentResponse, type NodeContext } from "@/lib/domain";
import { errorToText } from "@/lib/errorToText";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Wrapper from "../start/components/Wrapper";
import { BoxIcon } from "lucide-react";

type SetupStep = "form" | "creating" | "done";

type Stage = {
  label: string;
  progress: number;
};

const STAGES: Stage[] = [
  { label: "Checking docker environment", progress: 10 },
  { label: "Pulling node image", progress: 25 },
  { label: "Starting docker container", progress: 45 },
  { label: "Waiting for node to be ready", progress: 65 },
  { label: "Unlocking node keystore", progress: 80 },
  { label: "Registering node context", progress: 92 },
  { label: "Syncing blockchain data", progress: 98 },
];

function getDockerDetailMessage(
  env?: DockerEnvironmentResponse
): string | null {
  if (!env?.detail) return null;
  const raw = env.detail;
  const lower = raw.toLowerCase();
  if (env.installed && !env.daemon_running) {
    if (
      lower.includes("docker.sock") ||
      lower.includes("failed to connect") ||
      lower.includes("is the docker daemon running")
    ) {
      return "Docker Desktop is installed but not running. Please start Docker Desktop and wait until it reports Engine running.";
    }
  }
  if (!env.installed && lower.includes("no such file or directory")) {
    return "Docker CLI was not found. Install Docker Desktop (or Docker Engine) and re-check.";
  }
  return raw;
}

export default function Setup() {
  const nav = useNavigate();
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [step, setStep] = useState<SetupStep>("form");

  const network = useSetupStore((s) => s.network);
  const accountName = useSetupStore((s) => s.accountName);
  const mnemonic = useSetupStore((s) => s.mnemonic);
  const passwordHash = useSetupStore((s) => s.passwordHash);
  const currentContext = useContextStore((s) => s.currentContext);
  const setCurrentContext = useContextStore((s) => s.setCurrentContext);

  const deleteNodeMutation = useMutation({
    mutationFn: (nodeId: string) => contextsRemove(nodeId),
  });

  const prepareMutation = useMutation({
    mutationFn: (params: any) => {
      return prepareNodeResources(params);
    },
  });
  const initNodeMutation = useMutation({
    mutationFn: (params: {
      nodeId: string;
      mnemonic: string;
      image: string;
    }) => {
      return walletInitCli(params.nodeId, params.mnemonic, params.image);
    },
  });
  const nodeRunMutation = useMutation({
    mutationFn: (params: { nodeId: string }) => {
      return nodeRunCli(params.nodeId);
    },
  });

  const unlockNodeMutation = useMutation({
    mutationFn: (params: { nodeId: string }) => {
      return nodeUnlock(params.nodeId);
    },
  });

  const dockerEnvironmentQuery = useQuery({
    queryKey: ["docker_environment"],
    queryFn: dockerEnvironment,
  });

  const dockerDetailMessage = useMemo(
    () => getDockerDetailMessage(dockerEnvironmentQuery.data),
    [dockerEnvironmentQuery.data]
  );

  const create = async () => {
    const option = getNetworkOption(network);
    if (!option) {
      return;
    }
    if (!passwordHash || !accountName || !mnemonic) {
      toast.error("Missing required parameters.");
      return;
    }

    let context: NodeContext | null = null;
    try {
      setStageIndex(0);
      setProgress(STAGES[0].progress);
      setStep("creating");

      // Stage 1. Prepare node context
      context = await prepareMutation.mutateAsync({
        passwordHash: passwordHash,
        ldkImage: LDK_IMAGE,
        nodeName: accountName,
        network,
        esploraUrl: option.esploraUrl,
      });

      // Stage 2: initializing keystore via temporary container
      setStageIndex(1);
      setProgress(STAGES[1].progress);
      await initNodeMutation.mutateAsync({
        nodeId: context.node_id,
        mnemonic,
        image: LDK_IMAGE,
      });

      // Stage 3: starting persistent daemon container
      setStageIndex(3);
      setProgress(STAGES[3].progress);
      await nodeRunMutation.mutateAsync({ nodeId: context.node_id });

      setCurrentContext(context);
      setStageIndex(5);
      setProgress(STAGES[5].progress);

      setStageIndex(6);
      setProgress(STAGES[6].progress);
      await unlockNodeMutation.mutateAsync({ nodeId: context.node_id });

      setStep("done");
      eventsStart(context.node_id);
    } catch (e) {
      toast.error(errorToText(e));

      // Cleanup on failure
      if (context !== null) {
        deleteNodeMutation.mutate(context.node_id);
      }
    }
  };

  const onDone = async () => {
    nav("/create-wallet/result", { replace: true });
  };

  const stageName = useMemo(() => {
    if (step === "done") return "Node created successfully";
    return STAGES[stageIndex]?.label ?? "Preparing";
  }, [step, stageIndex]);

  const dockerEnvironmentLoading =
    dockerEnvironmentQuery.isLoading || dockerEnvironmentQuery.isFetching;
  const dockerInstalled = dockerEnvironmentQuery.data?.installed === true;
  const dockerRunning = dockerEnvironmentQuery.data?.daemon_running === true;
  const dockerVersion = dockerEnvironmentQuery.data?.version;
  const canCreate =
    dockerInstalled &&
    dockerRunning &&
    !initNodeMutation.isPending &&
    !nodeRunMutation.isPending;

  const DockerEnv = (
    <div className="rounded-3xl bg-background-3 p-4">
      <h4 className="text-lg font-medium">Docker Environment</h4>
      <div className="mt-4 space-y-1 text-base text-secondary-foreground">
        <div>
          Docker installed:{" "}
          {dockerEnvironmentLoading
            ? "Checking..."
            : dockerEnvironmentQuery.data?.installed
            ? "Yes"
            : "No"}
        </div>
        <div>
          Docker daemon:{" "}
          {dockerEnvironmentLoading
            ? "Checking..."
            : dockerRunning
            ? "Running"
            : "Not running"}
        </div>
        {dockerVersion ? <div>Version: {dockerVersion}</div> : null}
        {dockerDetailMessage ? (
          <div className="mt-4 text-sm text-error">{dockerDetailMessage}</div>
        ) : null}
      </div>
      <Button
        type="button"
        variant="destructive"
        className="mt-4 rounded-full"
        onClick={() => dockerEnvironmentQuery.refetch()}
        disabled={dockerEnvironmentLoading}
      >
        Re-check Environment
      </Button>
    </div>
  );

  // Form
  if (step === "form") {
    return (
      <Wrapper onBack={() => nav(-1)}>
        <div className="flex items-center justify-center w-[56px] h-[56px] mx-auto bg-background-3 rounded-2xl">
          <BoxIcon />
        </div>
        <h4 className="mt-5 text-xl text-center font-bold">Create Node</h4>
        <div className="mt-2 text-base text-secondary-foreground text-center">
          Configure your RGB Lightning Node. A Docker container will be started
          with the selected network.
        </div>
        <div className="mt-8">{DockerEnv}</div>

        {initNodeMutation.error || nodeRunMutation.error ? (
          <Alert variant="destructive">
            <AlertDescription>
              <AlertTitle>Failed to create node</AlertTitle>
              <div>{initNodeMutation.error?.message}</div>
              <div>{nodeRunMutation.error?.message}</div>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-8">
          <Button
            variant="white"
            type="button"
            size="lg"
            className="rounded-full w-full"
            disabled={!canCreate}
            loading={initNodeMutation.isPending || nodeRunMutation.isPending}
            onClick={create}
          >
            Create Node
          </Button>
        </div>
      </Wrapper>
    );
  }

  // Creating & Done
  return (
    <Wrapper onBack={() => nav(-1)}>
      <div className="flex items-center justify-center w-[56px] h-[56px] mx-auto bg-background-3 rounded-2xl">
        <BoxIcon />
      </div>
      <h4 className="mt-5 text-xl text-center font-bold">Create Node</h4>
      <div className="mt-2 text-base text-secondary-foreground text-center">
        Configure your RGB Lightning Node. A Docker container will be started
        with the selected network.
      </div>
      <div className="mt-8 space-y-8">
        <div className="rounded-3xl bg-background-3 p-4">
          <div className="text-lg font-medium">Setup Progress</div>
          <div className="mt-4 text-base text-secondary-foreground">
            {stageName}
          </div>
          {step === "creating" && (
            <style>{`
              @keyframes pg-shimmer {
                0%   { left: -55%; opacity: 0; }
                10%  { opacity: 1; }
                90%  { opacity: 1; }
                100% { left: 120%; opacity: 0; }
              }
              @keyframes pg-glow-pulse {
                0%, 100% { box-shadow: 0 0 8px 3px rgba(52,211,153,0.4); }
                50%       { box-shadow: 0 0 22px 7px rgba(52,211,153,0.85); }
              }
              @keyframes pg-dot-pulse {
                0%, 100% { box-shadow: 0 0 4px 2px rgba(110,231,183,0.5); opacity: 0.7; }
                50%       { box-shadow: 0 0 12px 5px rgba(110,231,183,0.95); opacity: 1; }
              }
            `}</style>
          )}
          <div className="relative mt-4 h-2.5 w-full overflow-hidden rounded-full bg-background-muted/80 ring-1 ring-white/10">
            {/* stripe texture */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundSize: "20px 100%",
              }}
            />
            {/* fill bar */}
            <div
              className="relative h-full overflow-hidden rounded-full transition-all duration-700 ease-out"
              style={{
                width: step === "done" ? "100%" : `${progress}%`,
                backgroundImage:
                  step === "done"
                    ? "linear-gradient(90deg, #34d399 0%, #10b981 50%, #6ee7b7 100%)"
                    : "linear-gradient(90deg, #34d399 0%, #10b981 40%, #6ee7b7 100%)",
                animation:
                  step === "creating"
                    ? "pg-glow-pulse 2s ease-in-out infinite"
                    : undefined,
              }}
            >
              {/* shimmer sweep — only while creating */}
              {step === "creating" ? (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: "50%",
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
                    animation: "pg-shimmer 2.2s ease-in-out infinite",
                  }}
                />
              ) : null}
            </div>
          </div>

          <div className="mt-1 text-right text-xs text-white/70">
            {step === "done" ? 100 : progress}%
          </div>
        </div>

        {currentContext ? (
          <div className="rounded-3xl bg-background-3 p-4">
            <div className="text-lg font-medium">Setup Details</div>
            <div className="mt-4 text-base text-secondary-foreground space-y-1">
              <div>
                <span className="text-">Name: </span>
                {currentContext.display_name}
              </div>
              <div>
                <span className="text-white/50">Node ID: </span>
                {currentContext.node_id}
              </div>
              <div>
                <span className="text-white/50">Main API: </span>
                {currentContext.main_api_base_url}
              </div>
              <div>
                <span className="text-white/50">Control API: </span>
                {currentContext.control_api_base_url}
              </div>
              <div>
                <span className="text-white/50">Container: </span>
                {currentContext.container_name}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-8">
        <Button
          variant="white"
          type="button"
          size="lg"
          className="rounded-full w-full"
          disabled={step === "creating"}
          loading={step === "creating"}
          onClick={onDone}
        >
          Next
        </Button>
      </div>
    </Wrapper>
  );
}
