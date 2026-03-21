import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import {
  contextsList,
  nodeRgbContracts,
  nodeRgbOnchainPayments,
} from "@/lib/commands";
import { RgbOnchainPaymentDto } from "@/lib/sdk";
import { useQuery } from "@tanstack/react-query";
import { formatAddress, trimChar } from "@/lib/utils";
import CopyText from "./CopyText";
import DownloadTransferConsignmentBtn from "./DownloadTransferConsignmentBtn";
import { NodeContext } from "@/lib/domain";

interface IProps {
  activeNodeId: string | null;
}
export default function RgbPaymentsList(props: IProps) {
  const { activeNodeId } = props;
  const [list, setList] = useState<RgbOnchainPaymentDto[]>([]);

  const rgbContractsQuery = useQuery({
    queryKey: ["dashboard_rgb_contracts", activeNodeId],
    queryFn: async () => {
      return nodeRgbContracts(activeNodeId!);
    },
    refetchInterval: false,
  });

  const contextsQuery = useQuery({
    queryKey: ["contexts"],
    queryFn: contextsList,
    refetchInterval: false,
  });

  const loadIssuers = async (nodeId: string) => {
    try {
      const data = await nodeRgbOnchainPayments(nodeId);
      console.log("data", data);
      setList(data.payments);
    } catch (e) {}
  };

  useEffect(() => {
    if (activeNodeId) {
      loadIssuers(activeNodeId);
    }
  }, [activeNodeId]);

  const calculateAmount = (contractId?: string, amount?: string) => {
    if (!amount || !contractId) return "";

    const rgbs = rgbContractsQuery.data?.contracts ?? [];
    const rgb = rgbs.find((r) => r.contract_id === contractId);
    if (rgb) {
      return Number(amount) / 10 ** (rgb.precision ?? 0);
    }
    return "";
  };

  const findName = (contractId?: string) => {
    if (!contractId) return "";

    const rgbs = rgbContractsQuery.data?.contracts ?? [];
    const rgb = rgbs.find((r) => r.contract_id === contractId);
    return rgb?.name ?? "";
  };

  const makeLink = (ctx: NodeContext | undefined, path: string) => {
    if (!ctx) return "";
    const url = `${trimChar(ctx?.main_api_base_url ?? "", "/")}${path}`;
    return url;
  };

  const context = contextsQuery.data || [];
  const currentContext = context.find((c) => c.node_id === activeNodeId);

  return (
    <>
      <Card className="mt-3">
        <CardHeader className="flex justify-between">
          <CardTitle className="flex justify-between">
            <span>RGB Payments List</span>
            <div className="flex gap-3">
              {/* <Button disabled={issuerImportMutation.isPending} variant="secondary" size="sm" onClick={selectFile}>Import Issuers</Button> */}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 w-full">
            <Table style={{ width: "max-content" }}>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Consignment Download Path</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {formatAddress(item.invoice, 30)}
                      <CopyText text={item.invoice ?? ""} />
                    </TableCell>
                    <TableCell>
                      {calculateAmount(item.contract_id, item.amount)}
                    </TableCell>

                    <TableCell>
                      {item.consignment_download_path
                        ? formatAddress(
                            makeLink(
                              currentContext,
                              item.consignment_download_path
                            ),
                            30
                          )
                        : ""}

                      {item.consignment_download_path ? (
                        <CopyText
                          text={makeLink(
                            currentContext,
                            item.consignment_download_path
                          )}
                        />
                      ) : null}

                      {item.consignment_download_path ? (
                        <DownloadTransferConsignmentBtn
                          name={findName(item.contract_id)}
                          link={makeLink(
                            currentContext,
                            item.consignment_download_path
                          )}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
