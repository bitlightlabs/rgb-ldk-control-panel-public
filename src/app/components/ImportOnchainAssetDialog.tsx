import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { nodeRgbContractImportBundle, pluginWalletAssetExport } from "@/lib/commands";
import { toast } from "sonner";
import { getNetworkOption } from "../config/networkOptions";
import { useNetworkStore } from "../stores/networkStore";

interface IProps {
  activeNodeId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportOnchainAsset(props: IProps) {
  const [posting, setPosting] = useState(false);
  const [contractId, setContractId] = useState('');
  const network = useNetworkStore((s) => s.network);

  const upload = async () => {
    if(!contractId || !props.activeNodeId) {
      return
    }

    try {
      setPosting(true);

      const config = getNetworkOption(network)
      const url = config.coreUrl
      if(!url) {
        throw new Error('Core URL not configured for this network')
      }
      // Download asset consignment
      const contract = await pluginWalletAssetExport(contractId, url);
      if(!contract.archive_base64) {
        throw new Error((contract as any).message || 'Failed')
      }

      // Import asset
      await nodeRgbContractImportBundle(props.activeNodeId, contractId, contract.archive_base64);

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
