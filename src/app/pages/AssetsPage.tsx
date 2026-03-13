import { AssetExplorer } from "@/app/components/AssetExplorer";
import { useAssetsStore } from "@/app/stores/assetsStore";
import { useNavStore } from "@/app/stores/navStore";
import { useNodeStore } from "@/app/stores/nodeStore";
import IssuerList from "../components/IssuerList";

export function AssetsPage() {
  const activeNodeId = useNodeStore((s) => s.activeNodeId);
  const selectedAssetId = useAssetsStore((s) => s.selectedAssetId);
  const detailOrigin = useAssetsStore((s) => s.detailOrigin);
  const clearSelectedAssetId = useAssetsStore((s) => s.clearSelectedAssetId);
  const setSelectedAssetId = useAssetsStore((s) => s.setSelectedAssetId);
  const setActiveTab = useNavStore((s) => s.setActiveTab);

  return (
    <div className="space-y-4">
      <AssetExplorer
        selectedAssetId={selectedAssetId}
        onSelectAsset={(assetId) => setSelectedAssetId(assetId, "assets")}
        onBackFromDetails={() => {
          if (detailOrigin === "dashboard") {
            clearSelectedAssetId();
            setActiveTab("dashboard");
            return;
          }
          clearSelectedAssetId();
        }}
        inlineDetails
        activeNodeId={activeNodeId ?? ''}
      />

      <IssuerList activeNodeId={activeNodeId} />
    </div>
  );
}
