import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NETWORK_OPTIONS, getNetworkOption } from "@/app/config/networkOptions";

import type {
  BitcoinNetwork,
  BootstrapLocalNodeRequest,
  BootstrapLocalNodeResponse,
  DockerEnvironmentResponse,
} from "@/lib/domain";
import { errorToText } from "@/lib/errorToText";
import IconDisk from "@/app/icons/disk";
import IconCloud from "@/app/icons/cloud";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import DropMenu from "@/app/components/DropMenu";
import IconDelete from "@/app/icons/delete";
import DeleteNodeDialog from "@/app/components/DeleteNodeDialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { contextsList, contextsRemove } from "@/lib/commands";
import { LDK_IMAGE } from "@/app/config/constant";


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
  onEnterWallet: (nodeId?: string) => void;
}) {
  const [step, setStep] = useState<SetupStep>("welcome");
  const [nodeName, setNodeName] = useState("");
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [userSelectNetwork, setUserSelectNetwork] =
    useState<BitcoinNetwork>("regtest");
  const [deleteNodeId, setDeleteNodeId] = useState<string>("");

  const deleteNodeMutation = useMutation({
    mutationFn: (nodeId: string) => contextsRemove(nodeId),
    onSuccess: async () => {
      contextsQuery.refetch();
    },
  });

  const contextsQuery = useQuery({
    queryKey: ["contexts"],
    queryFn: contextsList,
    refetchInterval: false,
  });
  const contexts = contextsQuery.data ?? [];

  const dockerInstalled = dockerEnvironment?.installed === true;
  const dockerRunning = dockerEnvironment?.daemon_running === true;
  const dockerDetailMessage = useMemo(
    () => getDockerDetailMessage(dockerEnvironment),
    [dockerEnvironment]
  );
  const isSelectedNetworkEnabled = NETWORK_OPTIONS.some(
    (item) => item.value === userSelectNetwork && item.enabled !== false
  );
  const canCreate =
    dockerInstalled &&
    dockerRunning &&
    !creatingNode &&
    isSelectedNetworkEnabled;

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

  const DockerEnv = (
    <div className="rounded-3xl bg-background-3 p-4">
      <h4 className="text-lg font-medium">Docker Environment</h4>
      <div className="mt-4 space-y-1 text-base text-secondary-foreground">
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
          <div className="mt-4 text-sm text-error">{dockerDetailMessage}</div>
        ) : null}
      </div>
      <Button
        type="button"
        variant="destructive"
        className="mt-4 rounded-full"
        onClick={onRefreshDockerEnvironment}
        disabled={dockerEnvironmentLoading}
      >
        Re-check Environment
      </Button>
    </div>
  );

  return (
    <>
      <div
        className="h-full bg-background bg-bottom-right bg-no-repeat"
        style={{ backgroundImage: `url(./bg-bottom-1.png)` }}
      >
        <div className="h-full relative">
          <div className="w-[200px] absolute inset-2 bg-background-2 pt-5 px-3 rounded-3xl border border-background-2">
            <div className="text-2xs text-secondary-foreground">
              QUICK LAUNCH
            </div>
            <div className="mt-8">
              <h2 className="text-base font-medium">Recent Nodes</h2>
            </div>

            {contexts.length > 0 ? (
              <div className="mt-3">
                {contexts.map((v) => {
                  return (
                    <div
                      key={v.node_id}
                      className="relative mb-2 p-3 bg-background-2 rounded-2xl cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => onEnterWallet(v.node_id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onEnterWallet(v.node_id);
                        }
                      }}
                    >
                      <div
                        className="absolute right-[10px] top-[10px]"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <DropMenu
                          className="w-6 h-6"
                          direaction="vertical"
                          list={[
                            {
                              label: (
                                <span className="text-error">Delete Node</span>
                              ),
                              icon: (
                                <IconDelete
                                  className="text-error"
                                  style={{ width: "20px", height: "20px" }}
                                />
                              ),
                              data: v.node_id,
                              onClick: (id) => setDeleteNodeId(id),
                            },
                          ]}
                        />
                      </div>
                      <h4 className="text-base font-medium truncate pr-8">
                        {v.display_name}
                      </h4>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="success">
                          {String(v.network).toUpperCase()}
                        </Badge>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <div className=" opacity-50">
                            <IconDisk
                              style={{ width: "14px", height: "14px" }}
                            />
                          </div>
                          <span className="text-xs">Local</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {contexts.length === 0 ? (
              <div className="mt-3 bg-background-3 p-3 rounded-2xl">
                <label className="text-base">No node found</label>
                <div className="mt-2 text-xs text-secondary-foreground">
                  Create a new node to get started with RGB Lightning Node
                </div>
              </div>
            ) : null}
          </div>
          <div className="h-full ml-[208px]">
            <div className="pt-[100px] px-6">
              <div className="flex justify-center">
                <img src="./icon.svg" width={80} height={80} />
              </div>
              <div className="mt-4 text-2xl font-bold text-center">
                RGB LIGHTNING NODE
              </div>
              <div className="mt-4 mx-auto text-secondary-foreground text-base text-center">
                Lightning Network with RGB protocol support.<br />
                Set up a new node or connect to an existing instance.
              </div>

              <div className="mt-10 grid grid-cols-2 gap-5">
                <div className="h-auto px-8 py-8 rounded-3xl bg-background-3 border border-background-2 hover:bg-background-2 justify-start text-left">
                  <div className="w-[56px] h-[56px] flex items-center justify-center bg-background-3 rounded-2xl">
                    <IconDisk style={{ width: "24px", height: "24px" }} />
                  </div>
                  <div className="mt-5 font-bold text-xl">Local Node</div>
                  <div className="h-15 leading-5 mt-2 text-base font-normal text-secondary-foreground whitespace-break-spaces">
                    Run a local node instance. Optimized for development and
                    testing workflows.
                  </div>
                  <div className="mt-5">
                    <Button
                      variant="white"
                      className="rounded-full"
                      onClick={() => setStep("form")}
                    >
                      Setup Local Node
                    </Button>
                  </div>
                </div>
                <div className="h-auto px-8 py-8 rounded-2xl bg-background-3 border border-background-2 hover:bg-background-2 justify-start text-left">
                  <div className="w-[56px] h-[56px] flex items-center justify-center bg-background-3 rounded-2xl">
                    <IconCloud style={{ width: "24px", height: "24px" }} />
                  </div>
                  <div className="mt-5 font-bold text-xl">Remote Node</div>
                  <div className="h-15 leading-5 mt-2 text-base font-normal text-secondary-foreground whitespace-break-spaces">
                    Connect to a hosted or self-managed node instance. Suitable
                    for production and scalable setups.
                  </div>
                  <div className="mt-5">
                    <Button variant="white" className="rounded-full" disabled>
                      Coming Soon
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create local node */}
      <Dialog
        open={step === "form"}
        onOpenChange={() => {
          setStep("welcome");
        }}
      >
        <DialogContent
          overlayClassName="bg-background backdrop-blur-none"
          className="w-[800px] bg-background-3"
        >
          <DialogHeader>
            <DialogTitle>Create Node</DialogTitle>
            <DialogDescription>
              Configure your RGB Lightning Node. A Docker container will be
              started with the selected network.
            </DialogDescription>
          </DialogHeader>

          {DockerEnv}

          <Field>
            <FieldLabel>Node Name (Optional)</FieldLabel>
            <Input
              placeholder="e.g. My Node"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              className="h-13 rounded-2xl text-[22px] bg-background-3"
            />
          </Field>

          {/* Network selection */}
          <Field>
            <FieldLabel>Network</FieldLabel>
            <div className="flex gap-4">
              {NETWORK_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="default"
                  disabled={creatingNode || opt.enabled === false}
                  onClick={() => setUserSelectNetwork(opt.value)}
                  className={[
                    "font-medium rounded-full",
                    userSelectNetwork === opt.value
                      ? "bg-background-muted hover:bg-background-muted/90 border border-secondary-foreground"
                      : "",
                  ].join(" ")}
                >
                  {opt.iconSrc ? (
                    <img src={opt.iconSrc} alt="" className="h-5 w-5" />
                  ) : null}
                  {opt.label.toUpperCase()}
                </Button>
              ))}
            </div>
          </Field>

          {createNodeError ? (
            <Alert variant="destructive">
              <AlertDescription>
                <AlertTitle>Failed to create node</AlertTitle>
                <div>
                  {errorToText(createNodeError)}
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              variant="white"
              type="button"
              size="lg"
              className="rounded-full w-full"
              disabled={!canCreate}
              onClick={async () => {
                setProgress(5);
                setStageIndex(0);
                try {
                  await onCreateNode({
                    ldkImage: LDK_IMAGE,
                    nodeName: nodeName.trim() || undefined,
                    network: userSelectNetwork,
                    esploraUrl: getNetworkOption(userSelectNetwork).esploraUrl,
                  });
                } catch {
                  // Error is surfaced via createNodeError prop
                }
              }}
            >
              Create Node
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Creating & Done */}
      <Dialog
        open={step === "creating" || step === "done"}
        onOpenChange={() => {
          setStep("welcome");
        }}
      >
        <DialogContent className="w-[800px]">
          <DialogHeader>
            <DialogTitle>Creating Node</DialogTitle>
            <DialogDescription>
              Configure your RGB Lightning Node. A Docker container will be
              started with the selected network.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[500px] space-y-8 overflow-y-auto">
            {DockerEnv}

            <div className="rounded-3xl bg-background-2 p-4">
              <div className="text-lg font-medium">Setup Progress</div>
              <div className="mt-4 text-base text-secondary-foreground">
                {stageName}
              </div>
              <div className="mt-4 h-[6px] w-full overflow-hidden rounded-full bg-background-muted">
                <div
                  className="h-full bg-success transition-all duration-500 ease-out"
                  style={{ width: step === "done" ? "100%" : `${progress}%` }}
                />
              </div>
              <div className="mt-1 text-right text-xs text-white/70">
                {step === "done" ? 100 : progress}%
              </div>
            </div>

            {createNodeResult ? (
              <div className="rounded-3xl bg-background-2 p-4">
                <div className="text-lg font-medium">Setup Details</div>
                <div className="mt-4 text-base text-secondary-foreground space-y-1">
                  <div>
                    <span className="text-">Name: </span>
                    {createNodeResult?.display_name}
                  </div>
                  <div>
                    <span className="text-white/50">Node ID: </span>
                    {createNodeResult?.node_id}
                  </div>
                  <div>
                    <span className="text-white/50">Main API: </span>
                    {createNodeResult?.main_api_base_url}
                  </div>
                  <div>
                    <span className="text-white/50">Control API: </span>
                    {createNodeResult?.control_api_base_url}
                  </div>
                  <div>
                    <span className="text-white/50">Container: </span>
                    {createNodeResult?.container_name}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="white"
              type="button"
              size="lg"
              className="rounded-full w-full"
              disabled={!canCreate}
              onClick={() => onEnterWallet()}
            >
              Enter Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Node */}
      {deleteNodeId !== "" ? (
        <DeleteNodeDialog
          show
          nodeId={deleteNodeId}
          onClose={() => setDeleteNodeId("")}
          pending={deleteNodeMutation.isPending}
          onSubmit={async (id) => {
            await deleteNodeMutation.mutate(id);
            setDeleteNodeId("");
          }}
        />
      ) : null}
    </>
  );
}
