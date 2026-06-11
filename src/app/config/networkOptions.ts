import mainnetIcon from "@/assets/mainnet.svg";
import regtestIcon from "@/assets/regtest.svg";
import testnet4Icon from "@/assets/testnet4.svg";
import type { BitcoinNetwork, NetworkOption } from "@/lib/domain";

export type AppNetworkOption = NetworkOption & {
    iconSrc?: string;
    coreUrl: string;
    enabled?: boolean;
    explorerUrl?: string;
    fee: string
};

export const NETWORK_OPTIONS: AppNetworkOption[] = [
    {
        value: "mainnet",
        label: "Mainnet",
        esploraUrl:
            import.meta.env.VITE_BITCOIN_API ??
            "https://bitcoin-mainnet-api.bitlightdev.info",
        enabled: false,
        coreUrl:
            import.meta.env.VITE_BITCOIN_CORE_API ??
            '',
        iconSrc: mainnetIcon,
        fee: import.meta.env.VITE_FEE_BITCOIN_API ?? ''
    },

    {
        value: "testnet4",
        label: "Testnet4",
        esploraUrl:
            import.meta.env.VITE_TESTNET4_API ??
            "https://testnet4-api.dev.bitlightdev.info",
        enabled: false,
        coreUrl:
            import.meta.env.VITE_TESTNET4_CORE_API ??
            '',
        iconSrc: testnet4Icon,
        fee: import.meta.env.VITE_FEE_TESTNET4_API ?? ''
    },
    {
        value: "regtest",
        label: "Regtest",
        esploraUrl:
            import.meta.env.VITE_REGTEST_API ??
            "https://btc-regtest-cat.bitlightdev.info",
        enabled: true,
        coreUrl:
            import.meta.env.VITE_REGTEST_CORE_API ??
            'https://core-regtest-prod-rgb012rc3a.bitlightdev.info',
        iconSrc: regtestIcon,
        explorerUrl: import.meta.env.VITE_REGTEST_WEB_EXPLORER,
        fee: import.meta.env.VITE_FEE_REGTEST_API ?? ''
    },
];

export function getDefaultNetworkOption(): AppNetworkOption {
    return NETWORK_OPTIONS.find((item) => item.enabled !== false) ?? NETWORK_OPTIONS[0];
}

export function getNetworkOption(value: BitcoinNetwork | null): AppNetworkOption | null {
    const config = NETWORK_OPTIONS.find((item) => item.value === value);
    if(!config) {
        return null;
    }

    return config;
}
