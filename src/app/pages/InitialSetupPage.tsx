import { useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type {
  BootstrapLocalEnvironmentResponse,
  DockerEnvironmentResponse,
} from "@/lib/domain";
import { errorToText } from "@/lib/errorToText";
import initBg from "@/assets/init_dark.png";
import logoDarkAnimation from "@/assets/logo_dark.json";

type Stage = {
  label: string;
  progress: number;
};

const STAGES: Stage[] = [
  { label: "Checking docker environment", progress: 10 },
  { label: "Starting docker containers", progress: 30 },
  { label: "Creating Alex and Bob nodes", progress: 52 },
  { label: "Funding 1 BTC per node", progress: 72 },
  { label: "Mining confirmation blocks", progress: 86 },
  { label: "Syncing Alex wallet and RGB state", progress: 91 },
  { label: "Issuing Alex RGB bootstrap asset", progress: 95 },
  { label: "Importing Alex RGB asset into Bob", progress: 98 },
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

export function InitialSetupPage({
  dockerEnvironment,
  dockerEnvironmentLoading,
  onRefreshDockerEnvironment,
  creatingEnvironment,
  createEnvironmentError,
  bootstrapEnvironmentResult,
  onCreateEnvironment,
  onEnterWallet,
}: {
  dockerEnvironment?: DockerEnvironmentResponse;
  dockerEnvironmentLoading: boolean;
  onRefreshDockerEnvironment: () => void;
  creatingEnvironment: boolean;
  createEnvironmentError?: unknown;
  bootstrapEnvironmentResult?: BootstrapLocalEnvironmentResponse;
  onCreateEnvironment: () => Promise<BootstrapLocalEnvironmentResponse>;
  onEnterWallet: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const dockerInstalled = dockerEnvironment?.installed === true;
  const dockerRunning = dockerEnvironment?.daemon_running === true;
  const dockerDetailMessage = useMemo(
    () => getDockerDetailMessage(dockerEnvironment),
    [dockerEnvironment]
  );
  const setupCompleted = !!bootstrapEnvironmentResult;
  const canStart = dockerInstalled && dockerRunning && !creatingEnvironment;

  useEffect(() => {
    if (
      creatingEnvironment ||
      createEnvironmentError ||
      bootstrapEnvironmentResult
    ) {
      setStarted(true);
    }
  }, [bootstrapEnvironmentResult, createEnvironmentError, creatingEnvironment]);

  useEffect(() => {
    if (!creatingEnvironment) {
      if (bootstrapEnvironmentResult) {
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
    }, 3500);

    return () => clearInterval(timer);
  }, [creatingEnvironment, bootstrapEnvironmentResult]);

  const stageName = useMemo(() => {
    if (bootstrapEnvironmentResult) return "Environment setup completed";
    return STAGES[stageIndex]?.label ?? "Preparing";
  }, [bootstrapEnvironmentResult, stageIndex]);

  return (
    <div
      className="relative flex h-full items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat p-6"
      style={{ backgroundImage: `url(${initBg})` }}
    >
      <div className="absolute inset-0 bg-black/55" />

      {!started ? (
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
            onClick={() => setStarted(true)}
          >
            Start
          </Button>
        </div>
      ) : (
        <div className="relative z-10 w-full max-w-3xl rounded-xl border border-white/15 bg-black/60 p-6 backdrop-blur">
          <div className="text-xl font-semibold text-white">Quick Start</div>
          <div className="mt-1 text-sm text-white/70">
            This will start all services from docker-compose, create Alex/Bob,
            fund each node with 1 BTC, mine blocks, issue an RGB asset on Alex,
            then import that RGB asset into Bob.
          </div>

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
              disabled={dockerEnvironmentLoading || creatingEnvironment}
            >
              Re-check Environment
            </Button>
          </div>

          <div className="mt-4 rounded-md border border-white/15 bg-white/5 p-3">
            <div className="text-sm font-medium text-white">Setup Progress</div>
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

          {bootstrapEnvironmentResult?.stage_logs?.length ? (
            <div className="mt-4 rounded-md border border-white/15 bg-white/5 p-3">
              <div className="text-sm font-medium text-white">
                Setup Details
              </div>
              <div className="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-white/70">
                {bootstrapEnvironmentResult.stage_logs.map((line, idx) => (
                  <div key={`${idx}-${line}`}>- {line}</div>
                ))}
              </div>
            </div>
          ) : null}

          {createEnvironmentError ? (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Failed to start local environment</AlertTitle>
              <AlertDescription>
                {errorToText(createEnvironmentError)}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-2">
            {setupCompleted ? (
              <Button type="button" className="w-full" onClick={onEnterWallet}>
                Enter Wallet
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStarted(false)}
                  disabled={creatingEnvironment}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className="min-w-[220px]"
                  disabled={!canStart}
                  onClick={async () => {
                    setProgress(5);
                    setStageIndex(0);
                    try {
                      await onCreateEnvironment();
                      setProgress(100);
                    } catch {
                      // Error is shown via mutation error state.
                    }
                  }}
                >
                  {creatingEnvironment ? "Starting..." : "Start"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
