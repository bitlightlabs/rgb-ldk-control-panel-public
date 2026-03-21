import mainnetIcon from "@/assets/mainnet.svg";
import regtestIcon from "@/assets/regtest.svg";
import testnet4Icon from "@/assets/testnet4.svg";
import type { BitcoinNetwork, NetworkOption } from "@/lib/domain";

export type AppNetworkOption = NetworkOption & {
    iconSrc?: string;
    coreUrl?: string;
    enabled?: boolean;
};

export const NETWORK_OPTIONS: AppNetworkOption[] = [
    {
        value: "mainnet",
        label: "Mainnet",
        esploraUrl:
            import.meta.env.VITE_BITCOIN_API ??
            "https://bitcoin-mainnet-api.bitlightdev.info",
        enabled: false,
        iconSrc: mainnetIcon,
    },

    {
        value: "testnet4",
        label: "Testnet4",
        esploraUrl:
            import.meta.env.VITE_TESTNET4_API ??
            "https://testnet4-api.dev.bitlightdev.info",
        enabled: false,
        iconSrc: testnet4Icon,
    },
    {
        value: "regtest",
        label: "Regtest",
        esploraUrl:
            import.meta.env.VITE_REGTEST_API ??
            "https://btc-regtest-cat.bitlightdev.info",
        enabled: true,
        coreUrl: 'https://core-regtest-stag.bitlightdev.info',
        iconSrc: regtestIcon,
    },
];

export function getDefaultNetworkOption(): AppNetworkOption {
    return NETWORK_OPTIONS.find((item) => item.enabled !== false) ?? NETWORK_OPTIONS[0];
}

export function getNetworkOption(value: BitcoinNetwork): AppNetworkOption {
    return NETWORK_OPTIONS.find((item) => item.value === value) ?? getDefaultNetworkOption();
}
