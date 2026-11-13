// TypeScript DTOs mirroring src/http/dto.rs
export interface ChannelClosing {
  btc_balances: {
    amount_sats: string;
    kind: string;
  }[];
  channel_id: string;
  close_source: string;
  counterparty_node_id: string;
  status: string;
  sweeping_balances: any[];
  rgb?: {
    local_amount: string;
    remote_amount: string;
    contract_id: string;
    sweep_status: 'parked' | 'in_flight' | 'done' | null;
  }
}
export interface LspPricing {
  pricing: {
    btc_capacity_ppm_per_year: number
    min_fee_sat: string
    onchain_cost_sat: string
  },
  assets: LspPricingAsset[]
}
export interface LspPricingAsset {
  asset_id: string
  ticker: string
  precision: number,
  asset_unit_price_sat: string,
  asset_rent_ppm_per_year: number,
  min_lsp_asset_balance: string,
  max_lsp_asset_balance: string,
  max_client_asset_balance: string,
  color_context: string
}

export interface LspConnectionInfo {
  pubkey: string
  address: string
  token?: string
  trust_peer_0conf: boolean
  trust_peer_no_reserve: boolean
}

export interface LspQuoteInfoResponse {
  lsps: {
    info: LspQuoteData,
    lsp_node_id: string
  }[]
}

export interface LspQuoteData {
  pricing: {
    btc_capacity_ppm_per_year: number,
    min_fee_sat: string
    onchain_cost_sat: string
  },
  rgb: {
    rgb_assets: LspPricingAsset[]
  },
  supported_options: {
    max_channel_balance_sat: string
    min_channel_balance_sat: string
    max_channel_expiry_blocks: number
    min_initial_client_balance_sat: string
    max_initial_client_balance_sat: string
    min_initial_lsp_balance_sat: string
    max_initial_lsp_balance_sat: string
  }
}

export interface LspOrderItem {
  announce_channel: boolean
  channel_expiry_blocks: number
  client_balance_sat: string
  counterparty_node_id: string
  created_at_unix_secs: string
  fee_total_sat: string
  fulfill_retry_count: number
  funded_at_height: number
  funding_outpoint: string
  lsp_balance_sat: string
  onchain_address: string
  onchain_paid_sat: string
  order_id: string
  order_state: 'created' | 'completed' | 'failed',
  order_total_sat: string
  paid_via: string
  payment_expires_at_unix_secs: number
  payment_state: 'expect_payment' | 'paid' | 'refunded',
  refund_onchain_address: string
  refund_txid: string
  rgb: {
    asset_id: string
    lsp_asset_balance: string
  }
}

export interface LspOrdersResponse {
  channel: any
  order: {
      "announce_channel": boolean
      "channel_expiry_blocks": number
      "client_balance_sat": string
      "funding_confirms_within_blocks": number,
      "lsp_balance_sat": string,
      "required_channel_confirmations": number
  },
  order_id: string,
  payment: {
      "bolt11": {
          "expires_at_unix_secs": string,
          "fee_total_sat": string,
          "invoice": string,
          "order_total_sat": string,
          "state": 'expect_payment' | 'paid' | 'refunded'
      },
      "onchain": {
          "address": string,
          "expires_at_unix_secs": string,
          "fee_total_sat": string,
          "min_onchain_payment_confirmations": number,
          "order_total_sat": string,
          "refund_onchain_address": string,
          "state": 'expect_payment' | 'paid' | 'refunded',
      }
  },
  rgb: {
    "asset_funding_outpoint": string,
    "asset_id": string
    "client_asset_balance": string
    "fee_breakdown": {
        "asset_rent_sat": string,
        "asset_sale_sat": string,
        "btc_rent_sat": string,
        "onchain_cost_sat": string
    },
    "lsp_asset_balance": string
  }
}

export interface LspOptions {
  service: {
    auto_close_expired_channels: boolean,
    bolt11_invoice_expiry_secs: number,
    channel_expiry_grace_blocks: number,
    late_deposit_refund_window_secs: string,
    max_fulfill_retries: number,
    min_onchain_payment_confirmations: number,
    require_token: null
  },
  supported_options: {
    max_channel_balance_sat: string
    max_channel_expiry_blocks: number,
    max_initial_client_balance_sat: string,
    max_initial_lsp_balance_sat: string,
    min_channel_balance_sat: string,
    min_funding_confirms_within_blocks: number,
    min_initial_client_balance_sat: string,
    min_initial_lsp_balance_sat: string,
    min_required_channel_confirmations: number,
    supports_zero_channel_reserve: boolean
  }
}

