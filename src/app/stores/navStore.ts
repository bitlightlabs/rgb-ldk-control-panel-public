import { create } from "zustand";
import { persist } from "zustand/middleware";

type NavState = {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
};

export const useNavStore = create<NavState>()(
  persist(
    (set) => ({
      activeTab: "dashboard",
      setActiveTab: (tabId) => set({ activeTab: tabId }),
    }),
    { name: "rgb-ldk-nav" }
  )
);

