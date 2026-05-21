import { create } from "zustand";

type Net = "regtest" | "mainnet" | "testnet" | "testnet4"

type SetupState = {
    network: Net;
    accountName: string;
    mnemonic: string;
    passwordHash: string;
    setNetwork: (network: Net) => void;
    setAccountName: (name: string) => void;
    setMnemonic: (mnemonic: string) => void;
    setPasswordHash: (hash: string) => void;
    resetSetup: () => void;
};

/**
 * Node setup store, used to store the state during the wallet creation process
 */
export const useSetupStore = create<SetupState>()((set) => ({
    network: "regtest",
    accountName: "",
    mnemonic: "",
    passwordHash: "",
    setNetwork: (network) => set({ network }),
    setAccountName: (name) => set({ accountName: name }),
    setMnemonic: (mnemonic) => set({ mnemonic }),
    setPasswordHash: (hash) => set({ passwordHash: hash }),
    resetSetup: () => set({ network: "regtest", accountName: "", mnemonic: "", passwordHash: "" }),
}));
