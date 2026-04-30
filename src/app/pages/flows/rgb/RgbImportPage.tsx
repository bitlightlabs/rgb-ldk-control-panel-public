import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useNodeStore } from "@/app/stores/nodeStore";
import { getNetworkOption } from "@/app/config/networkOptions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  contextsList,
  downloadTransferConsignmentFromLink,
  nodeRgbContractImportBundle,
  nodeRgbContracts,
  nodeRgbOnchainInvoiceCreate,
  nodeRgbOnchainTransferConsignmentAccept,
  nodeRgbSync,
  pluginWalletAssetExport,
} from "@/lib/commands";
import { errorToText } from "@/lib/errorToText";
import { u64 } from "@/lib/sdk";
import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import ImportStep from "@/app/components/ImportStep";
import Import1 from "./Import1";
import Import2 from "./Import2";
import Import2Invoice from "./Import2Invoice";
import Import3Consignment from "./Import3Consignment";
import ImportDone from "./ImportDone";
import { BitcoinNetwork } from "@/lib/domain";

type ImportStep = 1 | 2 | 3 | 4;

function isDigits(s: string): boolean {
  return /^\d+$/.test(s.trim());
}

export function RgbImportPage() {
  const navigate = useNavigate();
  const activeNodeId = useNodeStore((s) => s.activeNodeId);

  const [step, setStep] = useState<ImportStep>(1);
  // const [stepOneTab, setStepOneTab] = useState<"select" | "import">("select");
  const [selectedContractId, setSelectedContractId] = useState("");
  const [contractIdInput, setContractIdInput] = useState("");
  const [amount, setAmount] = useState("");
  const [utxo, setUtxo] = useState("");
  const [createdInvoice, setCreatedInvoice] = useState("");
  const [consignmentLink, setConsignmentLink] = useState("");
  // const [copiedInvoice, setCopiedInvoice] = useState(false);

  const contractsQuery = useQuery({
    queryKey: ["rgb_import_contracts", activeNodeId],
    queryFn: async () => {
      await nodeRgbSync(activeNodeId!);
      return nodeRgbContracts(activeNodeId!);
    },
    enabled: !!activeNodeId,
    refetchInterval: false,
  });

  const selectedContract = useMemo(() => {
    const contractId = selectedContractId.trim();
    if (!contractId) return null;
    return (
      (contractsQuery.data?.contracts ?? []).find(
        (c) => c.contract_id === contractId
      ) ?? null
    );
  }, [contractsQuery.data?.contracts, selectedContractId]);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) {
        throw new Error("No active node selected");
      }
      const contractId = contractIdInput.trim();
      if (!contractId) {
        throw new Error("Contract ID is required");
      }

      const list = await contextsList()
      const node = list.find((c) => c.node_id === activeNodeId)
      if(!node) {
        throw new Error('Node not found')
      }

      const config = getNetworkOption(node.network as BitcoinNetwork);
      if (!config.coreUrl) {
        throw new Error("Core URL not configured for this network");
      }

      // Download consignment
      const contract = await pluginWalletAssetExport(
        activeNodeId,
        contractId,
        config.coreUrl,
      );
      if (!contract.archive_base64) {
        throw new Error(
          (contract as any).message || "Failed to download contract"
        );
      }

      await nodeRgbContractImportBundle(
        activeNodeId,
        contractId,
        contract.archive_base64
      );
      return contractId;
    },
    onSuccess: async (contractId) => {
      await contractsQuery.refetch()

      toast.success("RGB contract imported");
      setSelectedContractId(contractId);
      setCreatedInvoice("");
      setConsignmentLink("");
      setAmount("");
      setStep(2);

    },
    onError: (e) => {
      toast.error((e as Error).message);
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) {
        throw new Error("No active node selected");
      }
      if (!selectedContract?.contract_id) {
        throw new Error("Contract not found. Please import asset first.");
      }
      if (!utxo.trim()) {
        throw new Error("Blinding UTXO is required");
      }
      if (!isDigits(amount) || amount.trim() === "0") {
        throw new Error("Amount must be an integer greater than 0");
      }

      const precision = selectedContract.precision ?? 0;
      const resp = await nodeRgbOnchainInvoiceCreate(activeNodeId, {
        contract_id: selectedContract.contract_id,
        amount: u64(Number(amount.trim()) * 10 ** precision),
        use_witness_utxo: false,
        blinding_utxo: utxo.trim(),
      });

      return resp.invoice;
    },
    onSuccess: (invoice) => {
      setCreatedInvoice(invoice);
      toast.success("RGB OnChain invoice created");
    },
    onError: (e) => {
      toast.error((e as Error).message);
    },
  });

  const acceptPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!activeNodeId) {
        throw new Error("No active node selected");
      }
      if (!createdInvoice.trim()) {
        throw new Error("Invoice is required");
      }
      if (!consignmentLink.trim() || !consignmentLink.startsWith("http")) {
        throw new Error("Consignment link is invalid");
      }

      const data = await downloadTransferConsignmentFromLink(activeNodeId, consignmentLink);
      if (!data.archive_base64) {
        throw new Error(
          (data as any).message || "Failed to download consignment"
        );
      }

      return nodeRgbOnchainTransferConsignmentAccept(
        activeNodeId,
        createdInvoice,
        data.archive_base64
      );
    },
    onSuccess: () => {
      toast.success("Payment accepted");
      setConsignmentLink("");
      setStep(4);
    },
    onError: (e) => {
      toast.error((e as Error).message);
    },
  });

  const stepItems = [
    { id: 1, label: "Select or Import Contract" },
    { id: 2, label: "Create Invoice" },
    { id: 3, label: "Paste Consignment Link" },
  ] as const;


  return (
    <ContentWrapper>
      <ContentHeader title="Import RGB Asset" onBack={() => navigate(-1)} />

      <Content>
        <div>

          {/* Contract id form */}
          {step === 1 && (
            <Import1
              contractIdInput={contractIdInput}
              setContractIdInput={setContractIdInput}
              disabled={
                importMutation.isPending || !contractIdInput.trim()
              }
              onNext={() => importMutation.mutate()}
            />
          )}

          {/* Create a invoice to receive assets */}
          {step === 2 && (
            <div>
              {!createdInvoice ? (
                <Import2
                  selectedContract={selectedContract}
                  amount={amount}
                  setAmount={setAmount}
                  setUtxo={setUtxo}
                  disabled={
                    createInvoiceMutation.isPending ||
                    !amount.trim() ||
                    !utxo.trim()
                  }
                  onNext={() => createInvoiceMutation.mutate()}
                />
              ) : (
                <Import2Invoice
                  invoice={createdInvoice}
                  selectedContract={selectedContract}
                  onNext={() => {
                    setStep(3);
                    setConsignmentLink("");
                  }}
                />
              )}
            </div>
          )}

          {step === 3 && (
            <Import3Consignment
              consignmentLink={consignmentLink}
              setConsignmentLink={setConsignmentLink}
              selectedContract={selectedContract}
              disabled={!consignmentLink || acceptPaymentMutation.isPending}
              onNext={() => acceptPaymentMutation.mutate()}
            />
          )}

          {step === 4 && (
            <ImportDone
              amount={amount}
              assetName={selectedContract?.name ?? ''}
            />
          )}

          {contractsQuery.isError && (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>
                {contractsQuery.isError
                  ? errorToText(contractsQuery.error)
                  : null}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Content>
    </ContentWrapper>
  );
}
