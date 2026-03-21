import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InitialSetupPage } from "@/app/pages/setup/InitialSetupPage";
import type {
  BootstrapLocalNodeRequest,
  BootstrapLocalNodeResponse,
  DockerEnvironmentResponse,
  NodeContext,
} from "@/lib/domain";

function StartupLoadingScreen({
  progress,
  stepText,
}: {
  progress: number;
  stepText: string;
}) {
  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Initializing Node Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">{stepText}</div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {Math.round(progress)}%
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function NodeSetupGuard({
  contexts,
  contextsReady,
  contextsPending,
  dockerEnvironmentData,
  dockerEnvironmentReady,
  dockerEnvironmentPending,
  dockerEnvironmentChecking,
  onRefreshDockerEnvironment,
  onCreateNode,
  creatingNode,
  createNodeError,
  createNodeResult,
  onEnterWallet,
  children,
}: {
  contexts: NodeContext[];
  contextsReady: boolean;
  contextsPending: boolean;
  dockerEnvironmentData: DockerEnvironmentResponse | undefined;
  dockerEnvironmentReady: boolean;
  dockerEnvironmentPending: boolean;
  dockerEnvironmentChecking: boolean;
  onRefreshDockerEnvironment: () => void;
  onCreateNode: (
    req: BootstrapLocalNodeRequest
  ) => Promise<BootstrapLocalNodeResponse>;
  creatingNode: boolean;
  createNodeError?: unknown;
  createNodeResult?: BootstrapLocalNodeResponse;
  onEnterWallet: () => void;
  children: ReactNode;
}) {
  const [progress, setProgress] = useState(5);
  const [walletEntered, setWalletEntered] = useState(false);
  const checksSettled = contextsReady && dockerEnvironmentReady;

  const stepText = useMemo(() => {
    if (contextsPending) return "Loading node contexts...";
    if (dockerEnvironmentPending) return "Checking Docker environment...";
    return "Startup checks completed.";
  }, [contextsPending, dockerEnvironmentPending]);

  useEffect(() => {
    if (checksSettled) {
      setProgress(100);
      return;
    }
    const timer = setInterval(() => {
      setProgress((prev) => Math.min(prev + 8, 92));
    }, 180);
    return () => clearInterval(timer);
  }, [checksSettled]);
  useEffect(() => {
    if (!createNodeResult) {
      setWalletEntered(false);
    }
  }, [createNodeResult]);

  const hasContexts = contexts.length > 0;
  const dockerInstalled = dockerEnvironmentData?.installed === true;
  const dockerRunning = dockerEnvironmentData?.daemon_running === true;
  const waitingForEnterWallet = !!createNodeResult && !walletEntered;
  const needInitialSetup =
    waitingForEnterWallet ||
    !hasContexts ||
    !dockerInstalled ||
    !dockerRunning ||
    creatingNode ||
    !!createNodeError;

  if (!checksSettled) {
    return <StartupLoadingScreen progress={progress} stepText={stepText} />;
  }

  if (needInitialSetup) {
    return (
      <InitialSetupPage
        dockerEnvironment={dockerEnvironmentData}
        dockerEnvironmentLoading={dockerEnvironmentChecking}
        onRefreshDockerEnvironment={onRefreshDockerEnvironment}
        creatingNode={creatingNode}
        createNodeError={createNodeError}
        createNodeResult={createNodeResult}
        onCreateNode={onCreateNode}
        onEnterWallet={() => {
          setWalletEntered(true);
          onEnterWallet();
        }}
      />
    );
  }

  return <>{children}</>;
}
