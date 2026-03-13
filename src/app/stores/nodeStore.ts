import { create } from "zustand";
import { persist } from "zustand/middleware";

type NodeState = {
  activeNodeId: string | null;
  setActiveNodeId: (nodeId: string | null) => void;
};

export const useNodeStore = create<NodeState>()(
  persist(
    (set) => ({
      activeNodeId: null,
      setActiveNodeId: (nodeId) => set({ activeNodeId: nodeId }),
    }),
    { name: "rgb-ldk-node" }
  )
);

