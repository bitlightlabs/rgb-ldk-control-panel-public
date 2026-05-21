import { NodeContext } from "@/lib/domain";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// This store is new and will replace nodeStore in the future
type ContextState = {
  currentContext: NodeContext | null;
  setCurrentContext: (data: NodeContext | null) => void;
};

export const useContextStore = create<ContextState>()(
  persist(
    (set) => ({
      currentContext: null,
      setCurrentContext: (data) => set({ currentContext: data }),
    }),
    { name: "rgb-ldk-current-context" }
  )
);


