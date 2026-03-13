import { create } from "zustand";
import { persist } from "zustand/middleware";

type AppState = {
  activeNodeId: string | null;
  setActiveNodeId: (nodeId: string | null) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeNodeId: null,
      setActiveNodeId: (nodeId) => set({ activeNodeId: nodeId }),
    }),
    { name: "rgb-ldk-control-panel" },
  ),
);
