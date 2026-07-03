import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useRgbContractImportFromPluginMutation,
  useRgbOnchainInvoiceCreateMutation,
  useRgbOnchainTransferConsignmentAcceptMutation,
} from "@/app/mutations";
import { useNodeRgbContractsSyncedQuery } from "@/app/queries";
import { errorToText } from "@/lib/errorToText";
import { u64 } from "@/lib/sdk";
import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import ImportStep from "@/app/components/ImportStep";
import Import1 from "./Import1";
import Import2 from "./Import2";
import Import2Invoice from "./Import2Invoice";
import Import3Consignment from "./Import3Consignment";
import ImportDone from "./ImportDone";
import { useContextStore } from "@/app/stores/contextStore";

type ImportStep = 1 | 2 | 3 | 4;

function isDigits(s: string): boolean {
  return /^\d+$/.test(s.trim());
}

export default function RgbImportPage() {
  const navigate = useNavigate();
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id ?? '';

  const [step, setStep] = useState<ImportStep>(1);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [contractIdInput, setContractIdInput] = useState("");
  const [amount, setAmount] = useState("");
  const [utxo, setUtxo] = useState("");
  const [createdInvoice, setCreatedInvoice] = useState("");
  const [consignmentLink, setConsignmentLink] = useState("");

  const contractsQuery = useNodeRgbContractsSyncedQuery(activeNodeId, {
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

  const importMutation = useRgbContractImportFromPluginMutation({
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

  const createInvoiceMutation = useRgbOnchainInvoiceCreateMutation({
    onSuccess: (resp) => {
      setCreatedInvoice(resp.invoice);
      toast.success("RGB OnChain invoice created");
    },
    onError: (e) => {
      toast.error((e as Error).message);
    },
  });

  const acceptPaymentMutation = useRgbOnchainTransferConsignmentAcceptMutation({
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
    <ContentWrapper className="mb-10">
      <ContentHeader title="Import RGB Asset" onBack={() => navigate(-1)} />

      <Content>
        {/* Contract id form */}
        {step === 1 ? (
          <Import1
            contractIdInput={contractIdInput}
            setContractIdInput={setContractIdInput}
            loading={importMutation.isPending || contractsQuery.isFetching}
            disabled={
              importMutation.isPending
              || !contractIdInput.trim()
              || contractsQuery.isFetching
            }
            onNext={() => {
              if (!activeNodeId) {
                toast.error("No active node selected");
                return;
              }
              const contractId = contractIdInput.trim();
              if (!contractId) {
                toast.error("Contract ID is required");
                return;
              }
              importMutation.mutate({ nodeId: activeNodeId, contractId });
            }}
          />
        ) : null}

          {/* Create a invoice to receive assets */}
          {step === 2 ? (
            <>
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
                  onNext={() => {
                    if (!activeNodeId) {
                      toast.error("No active node selected");
                      return;
                    }
                    if (!selectedContract?.contract_id) {
                      toast.error("Contract not found. Please import asset first.");
                      return;
                    }
                    if (!utxo.trim()) {
                      toast.error("Blinding UTXO is required");
                      return;
                    }
                    if (!isDigits(amount) || amount.trim() === "0") {
                      toast.error("Amount must be an integer greater than 0");
                      return;
                    }

                    const precision = selectedContract.precision ?? 0;
                    createInvoiceMutation.mutate({
                      nodeId: activeNodeId,
                      request: {
                        contract_id: selectedContract.contract_id,
                        amount: u64(Number(amount.trim()) * 10 ** precision),
                        use_witness_utxo: false,
                        blinding_utxo: utxo.trim(),
                      },
                    });
                  }}
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
            </>
          ) : null}

          {step === 3 ? (
            <Import3Consignment
              consignmentLink={consignmentLink}
              setConsignmentLink={setConsignmentLink}
              selectedContract={selectedContract}
              loading={acceptPaymentMutation.isPending}
              disabled={!consignmentLink || acceptPaymentMutation.isPending}
              onNext={() => {
                if (!activeNodeId) {
                  toast.error("No active node selected");
                  return;
                }
                if (!createdInvoice.trim()) {
                  toast.error("Invoice is required");
                  return;
                }
                if (!consignmentLink.trim() || !consignmentLink.startsWith("http")) {
                  toast.error("Consignment link is invalid");
                  return;
                }

                acceptPaymentMutation.mutate({
                  nodeId: activeNodeId,
                  consignmentLink,
                  invoice: createdInvoice,
                });
              }}
            />
          ) : null}

          {step === 4 ? (
            <ImportDone
              amount={amount}
              assetName={selectedContract?.name ?? ''}
            />
          ) : null}

          {contractsQuery.isError ? (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>
                {contractsQuery.isError
                  ? errorToText(contractsQuery.error)
                  : null}
              </AlertDescription>
            </Alert>
          ) : null}
      </Content>
    </ContentWrapper>
  );
}
