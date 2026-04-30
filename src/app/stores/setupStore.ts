import { create } from "zustand";

type SetupState = {
    forceInitialSetup: boolean;
    openInitialSetup: () => void;
    closeInitialSetup: () => void;
};

export const useSetupStore = create<SetupState>()((set) => ({
    forceInitialSetup: false,
    openInitialSetup: () => set({ forceInitialSetup: true }),
    closeInitialSetup: () => set({ forceInitialSetup: false }),
}));
