import { create } from "zustand";

type AssetDetailOrigin = "dashboard" | "assets";

type AssetsState = {
  selectedAssetId: string | null;
  detailOrigin: AssetDetailOrigin | null;
  setSelectedAssetId: (id: string | null, origin?: AssetDetailOrigin) => void;
  clearSelectedAssetId: () => void;
};

export const useAssetsStore = create<AssetsState>((set) => ({
  selectedAssetId: null,
  detailOrigin: null,
  setSelectedAssetId: (id, origin) =>
    set({
      selectedAssetId: id,
      detailOrigin: id ? (origin ?? "assets") : null,
    }),
  clearSelectedAssetId: () => set({ selectedAssetId: null, detailOrigin: null }),
}));
