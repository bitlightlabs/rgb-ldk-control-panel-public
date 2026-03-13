import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { nodeRgbContractImportBundle, pluginWalletAssetExport } from "@/lib/commands";
import { toast } from "sonner";
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { uint8ArrayToBase64 } from "@/lib/utils";

interface IProps {
  activeNodeId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportContract(props: IProps) {
  const [posting, setPosting] = useState(false);
  const [contractId, setContractId] = useState('');
  const [filePath, setFilePath] = useState<string>('');

  const selectFile = async () => {
    const selected = await open({
      multiple: false
    });
    if (selected) {
      setFilePath(selected)
    }
  }

  const upload = async () => {
    if(!contractId || !props.activeNodeId || !filePath) {
      return
    }

    try {
      setPosting(true);
      // Read file
      const fileContents = await readFile(filePath);
      const base64 = uint8ArrayToBase64(fileContents);
      // Import asset
      await nodeRgbContractImportBundle(props.activeNodeId, contractId, base64);

      props.onClose()
      props.onSuccess()
    } catch(e) {
      console.log(e)
      toast.error((e as Error).message)
    } finally {
      setPosting(false);
    }
  }

  return (
    <Dialog modal={false} open onOpenChange={() => props.onClose()}>
      <DialogContent>
        <form className='flex flex-col gap-4'>
          <DialogHeader>
            <DialogTitle>Import Contract</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <label className='block'>Contract ID</label>
            <Input type="text" id="contractId" onChange={(e) => setContractId(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <label className='block'>Contract File</label>
            {
              filePath ? (
                <span>{filePath}</span>
              ) : <Button type="button" size="sm" variant="secondary" onClick={selectFile}>Select file</Button>
            }
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="button" disabled={posting} onClick={upload}>
              {posting ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
