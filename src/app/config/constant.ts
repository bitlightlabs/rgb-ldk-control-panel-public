export const LDK_IMAGE = import.meta.env.VITE_RGB_LDK_NODE_IMAGE ?? "";
export const LOCAL_VAULT_KEY = "local_vault"
export const LOCAL_IGNORE_NEW_IMAGE = 'local_ignore_new_image'
export const LOCAL_SWAP_STRING = 'local_swap_string.json'

export const BTC_CARRIER_TIP = 'Every RGB Lightning transaction requires a BTC Carrier to carry RGB asset data. The initial transaction requires a larger Carrier, while subsequent transactions require only a minimal amount.'
export const LSP_CLIENT_BALANCE_TIP = 'Client Balance is the amount of BTC allocated to your side of the channel. This is also the amount you are required to pay for this channel.'

export const BITCOIN_DUST = import.meta.env.VITE_BITCOIN_DUST ?? 546;
export const BITCOIN_MONTH_BLOCKS = import.meta.env.VITE_BITCOIN_MONTH_BLOCKS ?? 4320;
