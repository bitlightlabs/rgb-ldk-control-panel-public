import { useNodeLspQuery } from "@/app/queries/lsp";
import { useContextStore } from "@/app/stores/contextStore";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from "@/components/ui/select";
import { LspConnectionInfo } from "@/lib/sdk/types";
import { useState } from "react";

interface IProps {
  onChange: (lsp: LspConnectionInfo) => void;
}
export default function LSPSelect(props: IProps) {
  const [selectedLsp, setSelectedLsp] = useState<LspConnectionInfo | null>(null);
  const currentContext = useContextStore((s) => s.currentContext);
  const activeNodeId = currentContext?.node_id;

  const lspQuery = useNodeLspQuery(activeNodeId, {
    enabled: !!activeNodeId,
  });
  // Currently, we are only supporting one LSP per node
  const lsp = lspQuery.data ? [lspQuery.data] : [];

  const changeLsp = (value: string) => {
    const selected = lsp.find((item) => item.pubkey === value);
    if(!selected) {
      return
    }

    setSelectedLsp(selected);
    props.onChange(selected);
  };

  return (
    <Select
      value={selectedLsp?.pubkey ?? ""}
      onValueChange={changeLsp}
    >
      <SelectTrigger className="bg-background-4">
        <span>{selectedLsp?.address ?? "Select an LSP"}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup className="space-y-2">
          <SelectLabel>Select LSP (Provider)</SelectLabel>

          {lsp.map((item) => (
            <SelectItem className="h-14" value={item.pubkey} key={item.pubkey}>
              <div className="text-base leading-5">{item.address}</div>
              <div className="mt-1 text-2xs text-secondary-foreground flex gap-2 items-center">
                <span>{item.pubkey}</span>
              </div>
            </SelectItem>
          ))}

          {/* <SelectItem className="h-14" value="2">
            <div className="text-base leading-5">Amboss Magma</div>
            <div className="mt-1 text-2xs text-secondary-foreground flex gap-2 items-center">
              <span>BTC/RGB</span>
              <Separator orientation="vertical" />
              <span>50,000 – 100,000,000 sats</span>
              <Separator orientation="vertical" />
              <span>Starting at 1,500 sats</span>
            </div>
          </SelectItem> */}

        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
