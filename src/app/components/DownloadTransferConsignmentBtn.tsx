import { Button } from "@/components/ui/button";
import { downloadTransferConsignmentFromLink } from "@/lib/commands";
import { base64ToUint8Array } from "@/lib/utils";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function DownloadTransferConsignmentBtn(props: {name: string, link: string}) {
  const download = async () => {
    if(!props.link) return;
    try {
      let data = await downloadTransferConsignmentFromLink(props.link);
      if(!data.archive_base64) {
        throw new Error((data as any).message || "Failed to download consignment");
      }

      // Svae file
      const path = await save({
        defaultPath: `${props.name}.raw`
      });
      if (!path) {
        throw new Error("File save cancelled by user");
      };
      const bytes = base64ToUint8Array(data.archive_base64);
      await writeFile(path, bytes);

    } catch(e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Button className="w-8 h-8 mx-3" variant="ghost" onClick={download}>
      <Download />
    </Button>
  )
}
