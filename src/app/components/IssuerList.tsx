import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { nodeRgbIssuers, nodeRgbIssuersImport } from "@/lib/commands";
import { open } from '@tauri-apps/plugin-dialog';
import { useMutation } from "@tanstack/react-query";
import { readFile } from '@tauri-apps/plugin-fs';

interface IProps {
  activeNodeId: string | null;
}
export default function IssuerList(props: IProps) {
  const { activeNodeId } = props;
  const [list, setList] = useState<string[]>([]);

  const loadIssuers = async (nodeId: string) => {
    try {
      const data = await nodeRgbIssuers(nodeId)
      setList(data.issuers);
    } catch(e) {}
  }

  useEffect(() => {
    if (activeNodeId) {
      loadIssuers(activeNodeId);
    }
  }, [activeNodeId]);

  const issuerImportMutation = useMutation({
    mutationFn: async (filePath: string) => {
      if(!activeNodeId) {
        throw new Error("No active node selected");
      }

      const filename = 'demo-issuer';
      const fileContents = await readFile(filePath);
      await nodeRgbIssuersImport(activeNodeId, filename, fileContents)
    },
    onSuccess: () => {
      loadIssuers(activeNodeId!);
    }
  })

  const selectFile = async () => {
    const selected = await open({
      multiple: false
    });
    if (selected) {
      issuerImportMutation.mutate(selected);
    }
  }

  return (
    <>
      <Card className="mt-3">
        <CardHeader className="flex justify-between">
          <CardTitle className="flex justify-between">
            <span>RGB Issuers List</span>
            <div className="flex gap-3">
              {/* <Button disabled={issuerImportMutation.isPending} variant="secondary" size="sm" onClick={selectFile}>Import Issuers</Button> */}
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
