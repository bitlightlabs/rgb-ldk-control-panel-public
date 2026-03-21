import { useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NETWORK_OPTIONS,
  getDefaultNetworkOption,
  getNetworkOption,
} from "@/app/config/networkOptions";
import type {
  BitcoinNetwork,
  BootstrapLocalNodeRequest,
  BootstrapLocalNodeResponse,
  DockerEnvironmentResponse,
} from "@/lib/domain";
import { errorToText } from "@/lib/errorToText";
import initBg from "@/assets/init_dark.png";
import logoDarkAnimation from "@/assets/logo_dark.json";
import { useNetworkStore } from "@/app/stores/networkStore";

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
  { label: "Finalizing setup", progress: 98 },
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

// Step types: "welcome" | "form" | "creating" | "done"
type SetupStep = "welcome" | "form" | "creating" | "done";

export function InitialSetupPage({
  dockerEnvironment,
  dockerEnvironmentLoading,
  onRefreshDockerEnvironment,
  creatingNode,
  createNodeError,
  createNodeResult,
  onCreateNode,
  onEnterWallet,
}: {
  dockerEnvironment?: DockerEnvironmentResponse;
  dockerEnvironmentLoading: boolean;
  onRefreshDockerEnvironment: () => void;
  creatingNode: boolean;
  createNodeError?: unknown;
  createNodeResult?: BootstrapLocalNodeResponse;
  onCreateNode: (
    req: BootstrapLocalNodeRequest
  ) => Promise<BootstrapLocalNodeResponse>;
  onEnterWallet: () => void;
}) {
  const [step, setStep] = useState<SetupStep>("welcome");
  const [nodeName, setNodeName] = useState("");
  // const [selectedNetwork, setSelectedNetwork] =
  //   useState<BitcoinNetwork>("regtest");
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const setSelectedNetwork = useNetworkStore((s) => s.setNetwork);
  const selectedNetwork = useNetworkStore((s) => s.network);

  const dockerInstalled = dockerEnvironment?.installed === true;
  const dockerRunning = dockerEnvironment?.daemon_running === true;
  const dockerDetailMessage = useMemo(
    () => getDockerDetailMessage(dockerEnvironment),
    [dockerEnvironment]
  );
  const isSelectedNetworkEnabled = NETWORK_OPTIONS.some(
    (item) => item.value === selectedNetwork && item.enabled !== false
  );
  const canCreate =
    dockerInstalled &&
    dockerRunning &&
    !creatingNode &&
    isSelectedNetworkEnabled;
  const selectedNetworkOption = getNetworkOption(selectedNetwork);

  useEffect(() => {
    if (isSelectedNetworkEnabled) return;
    setSelectedNetwork(getDefaultNetworkOption().value);
  }, [isSelectedNetworkEnabled, setSelectedNetwork]);

  // Sync step based on external mutation state
  useEffect(() => {
    if (creatingNode) {
      setStep("creating");
    } else if (createNodeResult) {
      setStep("done");
    } else if (createNodeError && step === "creating") {
      setStep("form");
    }
  }, [creatingNode, createNodeResult, createNodeError, step]);

  // Simulated progress timer while creating
  useEffect(() => {
    if (!creatingNode) {
      if (createNodeResult) {
        setProgress(100);
        setStageIndex(STAGES.length - 1);
      }
      return;
    }

    setStageIndex(0);
    setProgress(STAGES[0].progress);

    const timer = setInterval(() => {
      setStageIndex((prev) => {
        const next = Math.min(prev + 1, STAGES.length - 1);
        setProgress(STAGES[next].progress);
        return next;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [creatingNode, createNodeResult]);

  const stageName = useMemo(() => {
    if (createNodeResult) return "Node created successfully";
    return STAGES[stageIndex]?.label ?? "Preparing";
  }, [createNodeResult, stageIndex]);

  return (
    <div
      className="stable-scroll relative flex h-full items-center justify-center bg-cover bg-center bg-no-repeat p-6"
      style={{ backgroundImage: `url(${initBg})` }}
    >
      <div className="absolute inset-0 bg-black/55" />

      {/* ── Step 1: Welcome ── */}
      {step === "welcome" && (
        <div className="relative z-10 flex w-full max-w-2xl flex-col items-center justify-center text-center">
          <div className="w-[220px]">
            <Lottie animationData={logoDarkAnimation} loop autoplay />
          </div>
          <div className="text-3xl font-bold">RGB Lightning Node</div>
          <div className="text-foreground/50 text-sm">v0.1.0</div>
          <div className="mt-3 text-xl font-medium text-white md:text-2xl">
            Build, Transfer, and Settle RGB Assets on Lightning
          </div>
          <Button
            type="button"
            className="mt-8 h-14 min-w-[220px] text-lg"
            onClick={() => setStep("form")}
          >
            Start
          </Button>
        </div>
      )}

      {/* ── Step 2: Node Configuration Form ── */}
      {step === "form" && (
        <div className="relative z-10 w-full max-w-3xl rounded-xl border border-white/15 bg-black/60 p-6 backdrop-blur">
          <div className="text-xl font-semibold text-white">Create Node</div>
          <div className="mt-1 text-sm text-white/70">
            Configure your RGB Lightning Node. A Docker container will be
            started with the selected network.
          </div>

          {/* Docker status panel */}
          <div className="mt-4 rounded-md border border-white/15 bg-white/5 p-3 text-sm text-white/85">
            <div className="font-medium">Docker Environment</div>
            <div className="mt-2 space-y-1 text-xs text-white/70">
              <div>
                Docker installed:{" "}
                {dockerEnvironmentLoading
                  ? "Checking..."
                  : dockerInstalled
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
              {dockerEnvironment?.version ? (
                <div>Version: {dockerEnvironment.version}</div>
              ) : null}
              {dockerDetailMessage ? (
                <div className="text-red-500">{dockerDetailMessage}</div>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 border-white/30 bg-white/5 text-white hover:bg-white/10"
              onClick={onRefreshDockerEnvironment}
              disabled={dockerEnvironmentLoading}
            >
              Re-check Environment
            </Button>
          </div>

          {/* Node name */}
          <div className="mt-4 space-y-1">
            <Label className="text-sm text-white/85">
              Node Name <span className="text-white/40">(optional)</span>
            </Label>
            <Input
              type="text"
              placeholder="e.g. My Node"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              className="border-white/20 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-emerald-400"
              maxLength={64}
            />
          </div>

          {/* Network selection */}
          <div className="mt-4 space-y-2">
            <Label className="text-sm text-white/85">Network</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {NETWORK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={creatingNode || opt.enabled === false}
                  onClick={() => setSelectedNetwork(opt.value)}
                  className={[
                    "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/35",
                    selectedNetwork === opt.value
                      ? "border-emerald-400 bg-emerald-400/15 text-emerald-300"
                      : "border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10",
                  ].join(" ")}
                >
                  {opt.iconSrc ? (
                    <img src={opt.iconSrc} alt="" className="h-4 w-4" />
                  ) : null}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {createNodeError ? (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Failed to create node</AlertTitle>
              <AlertDescription>
                {errorToText(createNodeError)}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/30 bg-white/5 text-white hover:bg-white/10"
              onClick={() => setStep("welcome")}
            >
              Back
            </Button>
            <Button
              type="button"
              className="min-w-[180px]"
              disabled={!canCreate}
              onClick={async () => {
                setProgress(5);
                setStageIndex(0);
                try {
                  await onCreateNode({
                    nodeName: nodeName.trim() || undefined,
                    network: selectedNetwork,
                    esploraUrl: selectedNetworkOption.esploraUrl,
                  });
                } catch {
                  // Error is surfaced via createNodeError prop
                }
              }}
            >
              Create Node
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Creating (progress) ── */}
      {step === "creating" && (
        <div className="relative z-10 w-full max-w-3xl rounded-xl border border-white/15 bg-black/60 p-6 backdrop-blur">
          <div className="text-xl font-semibold text-white">Creating Node</div>
          <div className="mt-1 text-sm text-white/70">
            Starting the Docker container and initialising the node. This may
            take a minute on first run while the image is pulled.
          </div>

          <div className="mt-6 rounded-md border border-white/15 bg-white/5 p-3">
            <div className="text-sm font-medium text-white">Progress</div>
            <div className="mt-2 text-xs text-white/70">{stageName}</div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full bg-emerald-400 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 text-right text-xs text-white/70">
              {progress}%
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Done ── */}
      {step === "done" && createNodeResult && (
        <div className="relative z-10 w-full max-w-3xl rounded-xl border border-white/15 bg-black/60 p-6 backdrop-blur">
          <div className="text-xl font-semibold text-emerald-400">
            Node Ready
          </div>
          <div className="mt-1 text-sm text-white/70">
            Your RGB Lightning Node has been created and is running.
          </div>

          <div className="mt-4 rounded-md border border-white/15 bg-white/5 p-3 text-xs text-white/70 space-y-1">
            <div>
              <span className="text-white/50">Name: </span>
              {createNodeResult.display_name}
            </div>
            <div>
              <span className="text-white/50">Node ID: </span>
              {createNodeResult.node_id}
            </div>
            <div>
              <span className="text-white/50">Main API: </span>
              {createNodeResult.main_api_base_url}
            </div>
            <div>
              <span className="text-white/50">Control API: </span>
              {createNodeResult.control_api_base_url}
            </div>
            <div>
              <span className="text-white/50">Container: </span>
              {createNodeResult.container_name}
            </div>
          </div>

          {/* Progress bar at 100% */}
          <div className="mt-4 rounded-md border border-white/15 bg-white/5 p-3">
            <div className="text-sm font-medium text-white">Progress</div>
            <div className="mt-2 text-xs text-white/70">
              Node created successfully
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full bg-emerald-400 w-full transition-all duration-500 ease-out" />
            </div>
            <div className="mt-1 text-right text-xs text-white/70">100%</div>
          </div>

          <div className="mt-4">
            <Button type="button" className="w-full" onClick={onEnterWallet}>
              Enter Wallet
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
