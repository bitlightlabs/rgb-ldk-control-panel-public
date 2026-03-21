import { NodeContext } from "@/lib/domain";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type ContextState = {
  contexts: NodeContext[];
  setContexts: (list: NodeContext[]) => void;
};

export const useContextStore = create<ContextState>()(
  persist(
    (set) => ({
      contexts: [],
      setContexts: (list: NodeContext[]) => set({ contexts: list }),
    }),
    { name: "rgb-ldk-contexts" }
  )
);

