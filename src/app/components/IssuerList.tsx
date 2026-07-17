import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNodeRgbIssuersQuery } from "@/app/queries";
import { useRgbIssuersImportMutation } from "@/app/mutations";
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { toast } from "sonner";

interface IProps {
  activeNodeId: string | null;
}
export default function IssuerList(props: IProps) {
  const { activeNodeId } = props;
  const issuersQuery = useNodeRgbIssuersQuery(activeNodeId, {
    refetchInterval: false,
  });

  const issuerImportMutation = useRgbIssuersImportMutation({
    onSuccess: () => {
      toast.success("Issuer imported successfully");
      issuersQuery.refetch();
    }
  })

  const importIssuer = async (filePath: string) => {
    try {
      if(!activeNodeId) {
        throw new Error("No active node selected");
      }

      const filename = 'demo-issuer';
      const fileContents = await readFile(filePath);
      issuerImportMutation.mutate({
        nodeId: activeNodeId,
        name: filename,
        fileData: fileContents,
      });
    } catch(e) {}
  }

  const selectFile = async () => {
    const selected = await open({
      multiple: false
    });
    if (selected) {
      importIssuer(selected);
    }
  }
  const list = issuersQuery.data?.issuers ?? [];

  return (
    <>
      <Card className="mt-3">
        <CardHeader className="flex justify-between">
          <CardTitle className="flex justify-between">
            <span>RGB Issuers List</span>
            <div className="flex gap-3">
              <Button disabled={issuerImportMutation.isPending} variant="secondary" size="sm" onClick={selectFile}>Import Issuers</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table className='w-full'>
            <TableHeader>
              <TableRow>
                <TableHead>Issuer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item) => (
                <TableRow key={item}>
                  <TableCell>{item}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
