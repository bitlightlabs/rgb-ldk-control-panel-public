import { useEffect, useState } from "react";
import { useContextStore } from "@/app/stores/contextStore";
import CopyText from "@/app/components/CopyText";
import { formatAddress } from "@/lib/utils";
import { toast } from "sonner";
import { useNodeWalletAddressCurrentQuery } from "@/app/queries";
import { useNodeWalletNewAddressMutation } from "@/app/mutations";

export default function CachedBtcAddress() {
  const [address, setAddress] = useState<string>('')
  const currentContext = useContextStore((s) => s.currentContext)
  const currentAddressQuery = useNodeWalletAddressCurrentQuery(
    currentContext?.node_id,
    { retry: false },
  );
  const newAddressMutation = useNodeWalletNewAddressMutation();

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Copy successful");
    } catch (e) {}
  }

  useEffect(() => {
    if (currentAddressQuery.data?.address) {
      setAddress(currentAddressQuery.data.address);
    }
  }, [currentAddressQuery.data?.address])

  useEffect(() => {
    if (!currentContext || !currentAddressQuery.isError || address) return;

    newAddressMutation
      .mutateAsync(currentContext.node_id)
      .then((data) => setAddress(data.address))
      .catch(() => {});
  }, [address, currentAddressQuery.isError, currentContext, newAddressMutation])

  return (
    <>
      <span className="cursor-pointer" onClick={copyAddress}>{formatAddress(address, 16)}</span>
      <CopyText text={address} />
    </>
  )
}
