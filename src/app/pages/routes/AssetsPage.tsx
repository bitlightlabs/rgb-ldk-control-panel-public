import { AssetExplorer } from "@/app/components/AssetExplorer";
import RgbPaymentsList from "@/app/components/RgbPaymentsList";
import { useAssetsStore } from "@/app/stores/assetsStore";
import { useNodeStore } from "@/app/stores/nodeStore";
import { useNavigate } from "react-router-dom";
// import IssuerList from "@/app/components/IssuerList";

export function AssetsPage() {
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const selectedAssetId = useAssetsStore((s) => s.selectedAssetId);
  const detailOrigin = useAssetsStore((s) => s.detailOrigin);
  const clearSelectedAssetId = useAssetsStore((s) => s.clearSelectedAssetId);
  const setSelectedAssetId = useAssetsStore((s) => s.setSelectedAssetId);
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <AssetExplorer
        selectedAssetId={selectedAssetId}
        onSelectAsset={(assetId) => setSelectedAssetId(assetId, "assets")}
        onBackFromDetails={() => {
          if (detailOrigin === "dashboard") {
            clearSelectedAssetId();
            navigate("/dashboard");
            return;
          }
          clearSelectedAssetId();
        }}
        inlineDetails
        activeNodeId={activeNodeId ?? ""}
      />

      {/* <IssuerList activeNodeId={activeNodeId} /> */}
      {/* <RgbPaymentsList activeNodeId={activeNodeId} /> */}
    </div>
  );
}
