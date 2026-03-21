import { BitcoinNetwork } from "@/lib/domain";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type NetworkState = {
  network: BitcoinNetwork
  setNetwork: (network: BitcoinNetwork) => void;
};

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set) => ({
      network: 'regtest',
      setNetwork: (network: BitcoinNetwork) => set({ network }),
    }),
    { name: "rgb-ldk-current-network" }
  )
);

