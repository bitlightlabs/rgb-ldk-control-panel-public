// Generated. Do not edit.
// Source: crates/rgbldk_http_dto/src/dto/
// Run: `pnpm gen` at repo root.

export type U64String = string;

export interface AsyncBlindedPathsRequest {
  recipient_id_hex: string;
}

export interface AsyncBlindedPathsResponse {
  paths_hex: string;
}

export interface AsyncReceiveOfferResponse {
  offer: string;
}

export interface AsyncSetStaticInvoiceServerPathsRequest {
  paths_hex: string;
}

export interface BalancesDto {
  btc: BtcBalancesDto;
  rgb: RgbBalancesDto;
}

export interface Bolt11ClaimForHashRequest {
  payment_hash: string;
  preimage: string;
  claimable_amount_msat: U64String;
}

export interface Bolt11DecodeRequest {
  invoice: string;
}

export interface Bolt11DecodeResponse {
  payment_hash: string;
  destination: string;
  amount_msat?: U64String | null;
  expiry_secs: U64String;
}

export interface Bolt11FailForHashRequest {
  payment_hash: string;
}

export interface Bolt11PayRequest {
  invoice: string;
  amount_msat?: U64String | null;
}

export interface Bolt11PayResponse {
  payment_id: string;
  preimage: string;
  amount_sats: U64String;
  destination: string;
  fee_paid_msat?: U64String | null;
}

export interface Bolt11ReceiveForHashRequest {
  amount_msat: U64String;
  description: string;
  expiry_secs: number;
  payment_hash: string;
}

export interface Bolt11ReceiveRequest {
  amount_msat: U64String;
  description: string;
  expiry_secs: number;
}

export interface Bolt11ReceiveResponse {
  invoice: string;
}

export interface Bolt11ReceiveVarRequest {
  description: string;
  expiry_secs: number;
}

export interface Bolt11SendRequest {
  invoice: string;
}

export interface Bolt11SendUsingAmountRequest {
  invoice: string;
  amount_msat: U64String;
}

export interface Bolt12OfferDecodeRequest {
  offer: string;
}

export interface Bolt12OfferDecodeResponse {
  offer_id: string;
  signing_pubkey?: string | null;
  description?: string | null;
  issuer?: string | null;
  amount_msat?: U64String | null;
  absolute_expiry_unix_secs?: U64String | null;
  chain_hashes?: string[];
  paths_count: number;
  expects_quantity: boolean;
}

export interface Bolt12OfferReceiveRequest {
  amount_msat: U64String;
  description: string;
  expiry_secs?: number | null;
  quantity?: U64String | null;
}

export interface Bolt12OfferReceiveVarRequest {
  description: string;
  expiry_secs?: number | null;
}

export interface Bolt12OfferResponse {
  offer: string;
}

export interface Bolt12OfferSendRequest {
  offer: string;
  amount_msat?: U64String | null;
  quantity?: U64String | null;
  payer_note?: string | null;
}

export interface Bolt12RefundDecodeRequest {
  refund: string;
}

export interface Bolt12RefundDecodeResponse {
  description: string;
  issuer?: string | null;
  amount_msat: U64String;
  absolute_expiry_unix_secs?: U64String | null;
  chain_hash: string;
  payer_signing_pubkey: string;
  payer_note?: string | null;
  quantity?: U64String | null;
  paths_count: number;
}

export interface Bolt12RefundInitiateRequest {
  amount_msat: U64String;
  expiry_secs: number;
  quantity?: U64String | null;
  payer_note?: string | null;
}

export interface Bolt12RefundInitiateResponse {
  refund: string;
  payment_id: string;
}

export interface Bolt12RefundRequestPaymentRequest {
  refund: string;
}

export interface Bolt12RefundRequestPaymentResponse {
  invoice: string;
  invoice_hex: string;
  payment_id: string;
}

export interface BtcBalancesDto {
  onchain_total_sats: U64String;
  onchain_spendable_sats: U64String;
  anchor_channels_reserve_sats: U64String;
  lightning_total_sats: U64String;
}

export interface ChannelDetailsExtendedDto {
  channel_id: string;
  user_channel_id: string;
  counterparty_node_id: string;
  channel_point?: string | null;
  short_channel_id?: U64String;
  outbound_scid_alias?: U64String;
  inbound_scid_alias?: U64String;
  channel_value_sats: U64String;
  outbound_capacity_msat: U64String;
  inbound_capacity_msat: U64String;
  local_balance_msat?: U64String;
  remote_balance_msat?: U64String;
  local_unspendable_punishment_reserve_sats?: U64String;
  remote_unspendable_punishment_reserve_sats: U64String;
  is_channel_ready: boolean;
  is_usable: boolean;
  is_announced: boolean;
  rgb_balance?: RgbChannelBalanceDto;
  lsp?: ChannelLspLeaseDto | null;
}

export interface ChannelLspLeaseDto {
  pubkey: string;
  address: string;
  order_id: string;
  funded_at_height: number;
  expires_at_height: number;
  funded_at_unix_secs: U64String;
  created_at_unix_secs: U64String;
}

export interface ChannelUpdateInfoDto {
  last_update: number;
  enabled: boolean;
  cltv_expiry_delta: number;
  htlc_minimum_msat: U64String;
  htlc_maximum_msat: U64String;
  fee_base_msat: number;
  fee_proportional_millionths: number;
}

export interface CloseChannelRequest {
  user_channel_id: string;
  counterparty_node_id: string;
}

export interface ClosingBtcBalanceDto {
  kind: string;
  amount_sats: U64String;
  maturity_height?: number;
  blocks_remaining?: number;
}

export interface ClosingChannelDto {
  channel_id: string;
  counterparty_node_id: string;
  user_channel_id?: string;
  status: ClosingChannelStatusDto;
  close_source: ClosingSourceDto;
  closing_txid?: string;
  btc_balances: ClosingBtcBalanceDto[];
  sweeping_balances: ClosingBtcBalanceDto[];
  rgb?: ClosingRgbDto;
}

export interface ClosingRgbDto {
  contract_id: string;
  local_amount: U64String;
  remote_amount: U64String;
  sweep_status?: RgbSweepStatusDto;
  sweep_txid?: string;
}

export interface ControlLockRequest {
  yes: boolean;
  force?: boolean;
}

export interface ControlStatusDto {
  locked: boolean;
}

export interface ControlUnlockRequest {
  passphrase?: string;
}

export interface ControlVersionDto {
  ok: boolean;
  protocol: string;
  daemon: string;
  daemon_version: string;
}

export interface CustomTlvDto {
  type: U64String;
  value_hex: string;
}

export interface DirectionalPolicy {
  asset_id?: number[] | null;
  source: string;
  destination: string;
  channel_scid: U64String;
  base_fee_msat: number;
  fee_proportional_millionths: number;
  cltv_expiry_delta: number;
  htlc_minimum_msat: U64String;
  htlc_maximum_msat: U64String;
  rgb_htlc_maximum: U64String | null;
  enabled: boolean;
  provenance: string;
  last_update?: number | null;
}

export interface ErrorResponse {
  ok: boolean;
  error: string;
  hint?: string;
  checks?: HealthCheckDto[];
}

export interface ExecutionPlan {
  format_version: number;
  version: U64String;
  quote: SwapQuote;
  policy_snapshot_at_unix_secs: U64String;
  maker_to_taker: LegPlan;
  taker_to_maker: LegPlan;
}

export interface HealthCheckDto {
  name: string;
  ok: boolean;
  detail?: string;
  hint?: string;
}

export interface HopPlan {
  source: string;
  node_id: string;
  channel_scid: U64String;
  btc_input_msat: U64String;
  btc_output_msat: U64String | null;
  rgb_input: U64String | null;
  rgb_output: U64String | null;
  incoming_cltv_delta: number;
  outgoing_cltv_delta?: number | null;
  policy: DirectionalPolicy;
}

export interface LegConstraints {
  fixed_route?: RouteEdge[] | null;
  required_nodes: string[];
  required_channels: U64String[];
  required_lsps: string[];
  max_fee_msat: U64String;
}

export interface LegPlan {
  direction: LegDirection;
  asset: LegAsset;
  fee_payer: FeePayer;
  constraints: LegConstraints;
  fee_msat: U64String;
  hops: HopPlan[];
}

export interface ListeningAddressesResponse {
  addresses: string[];
}

export interface LockedStatusDto {
  locked: boolean;
}

export interface LspAddRequest {
  pubkey: string;
  address: string;
  token?: string | null;
  trust_peer_0conf: boolean;
  trust_peer_no_reserve: boolean;
}

export interface LspDto {
  pubkey: string;
  address: string;
  token?: string | null;
  trust_peer_0conf: boolean;
  trust_peer_no_reserve: boolean;
  protocols?: number[] | null;
}

export interface LspListResponse {
  lsps: LspDto[];
}

export interface Lsps1AssetPricingDto {
  asset_id: string;
  ticker: string;
  precision: number;
  asset_unit_price_sat: U64String;
  asset_rent_ppm_per_year: number;
  min_lsp_asset_balance: U64String;
  max_lsp_asset_balance: U64String;
  max_client_asset_balance: U64String;
  color_context: string;
}

export interface Lsps1Bolt11PaymentDto {
  state: string;
  expires_at_unix_secs: U64String;
  fee_total_sat: U64String;
  order_total_sat: U64String;
  invoice: string;
}

export interface Lsps1ChannelInfoDto {
  funded_at_unix_secs: U64String;
  funding_outpoint: string;
  expires_at_unix_secs: U64String;
}

export interface Lsps1InfoEntryDto {
  lsp_node_id: string;
  info?: Lsps1InfoResponse | null;
  error?: unknown | null;
}

export interface Lsps1InfoListResponse {
  lsps: Lsps1InfoEntryDto[];
}

export interface Lsps1InfoQuery {
  lsp_node_id?: string | null;
}

export interface Lsps1InfoResponse {
  supported_options: Lsps1SupportedOptionsDto;
  pricing?: Lsps1LspPricingDto | null;
  rgb?: Lsps1RgbOfferingDto | null;
}

export interface Lsps1LspPricingDto {
  btc_capacity_ppm_per_year: number;
  onchain_cost_sat?: U64String | null;
  min_fee_sat?: U64String | null;
}

export interface Lsps1OnchainPaymentDto {
  state: string;
  expires_at_unix_secs: U64String;
  fee_total_sat: U64String;
  order_total_sat: U64String;
  address: string;
  min_onchain_payment_confirmations?: number | null;
  refund_onchain_address?: string | null;
}

export interface Lsps1OptionsDto {
  supported_options: Lsps1SupportedOptionsDto;
  service: Lsps1ServiceBehaviorDto;
}

export interface Lsps1OrderCreateRequest {
  lsp_node_id: string;
  lsp_balance_sat: U64String;
  client_balance_sat?: U64String;
  channel_expiry_blocks: number;
  announce_channel?: boolean;
}

export interface Lsps1OrderParamsDto {
  lsp_balance_sat: U64String;
  client_balance_sat: U64String;
  required_channel_confirmations: number;
  funding_confirms_within_blocks: number;
  channel_expiry_blocks: number;
  announce_channel: boolean;
}

export interface Lsps1OrderResponse {
  order_id: string;
  order: Lsps1OrderParamsDto;
  payment: Lsps1PaymentOptionsDto;
  channel?: Lsps1ChannelInfoDto | null;
  rgb?: Lsps1RgbOrderDetailsDto | null;
}

export interface Lsps1PaymentOptionsDto {
  bolt11?: Lsps1Bolt11PaymentDto | null;
  onchain?: Lsps1OnchainPaymentDto | null;
}

export interface Lsps1PricingCoreDto {
  btc_capacity_ppm_per_year: number;
  onchain_cost_sat: U64String;
  min_fee_sat: U64String;
}

export interface Lsps1PricingDto {
  pricing: Lsps1PricingCoreDto;
  assets: Lsps1AssetPricingDto[];
}

export interface Lsps1RgbAssetOfferDto {
  asset_id: string;
  ticker: string;
  precision: number;
  asset_unit_price_sat: U64String;
  asset_rent_ppm_per_year: number;
  min_lsp_asset_balance: U64String;
  max_lsp_asset_balance: U64String;
  max_client_asset_balance: U64String;
}

export interface Lsps1RgbFeeBreakdownDto {
  onchain_cost_sat: U64String;
  btc_rent_sat: U64String;
  asset_rent_sat: U64String;
  asset_sale_sat: U64String;
}

export interface Lsps1RgbOfferingDto {
  rgb_assets: Lsps1RgbAssetOfferDto[];
}

export interface Lsps1RgbOrderCreateRequest {
  lsp_node_id: string;
  asset_id: string;
  lsp_asset_balance: U64String;
  client_asset_balance?: U64String;
  lsp_balance_sat: U64String;
  client_balance_sat?: U64String;
  channel_expiry_blocks: number;
  announce_channel?: boolean;
}

export interface Lsps1RgbOrderDetailsDto {
  asset_id: string;
  lsp_asset_balance: U64String;
  client_asset_balance: U64String;
  fee_breakdown: Lsps1RgbFeeBreakdownDto;
  asset_funding_outpoint?: string | null;
}

export interface Lsps1ServiceBehaviorDto {
  require_token?: string | null;
  bolt11_invoice_expiry_secs: number;
  min_onchain_payment_confirmations: number;
  auto_close_expired_channels: boolean;
  channel_expiry_grace_blocks: number;
  late_deposit_refund_window_secs: U64String;
  onchain_open_timeout_blocks?: number;
}

export interface Lsps1ServiceOrderDto {
  order_id: string;
  counterparty_node_id: string;
  order_state: string;
  payment_state: string;
  paid_via?: string | null;
  lsp_balance_sat: U64String;
  client_balance_sat: U64String;
  channel_expiry_blocks: number;
  announce_channel: boolean;
  fee_total_sat: U64String;
  order_total_sat: U64String;
  onchain_address?: string | null;
  onchain_paid_sat?: U64String | null;
  refund_onchain_address?: string | null;
  refund_txid?: string | null;
  fulfill_retry_count: number;
  created_at_unix_secs: U64String;
  payment_expires_at_unix_secs: U64String;
  funding_outpoint?: string | null;
  funded_at_height?: number | null;
  channel_closed_at_unix_secs?: U64String | null;
  rgb?: Lsps1ServiceRgbOrderDto | null;
}

export interface Lsps1ServiceOrdersResponse {
  orders: Lsps1ServiceOrderDto[];
}

export interface Lsps1ServiceRgbOrderDto {
  asset_id: string;
  lsp_asset_balance: U64String;
  client_asset_balance: U64String;
  fee_breakdown: Lsps1RgbFeeBreakdownDto;
}

export interface Lsps1SupportedOptionsDto {
  min_required_channel_confirmations: number;
  min_funding_confirms_within_blocks: number;
  supports_zero_channel_reserve: boolean;
  max_channel_expiry_blocks: number;
  min_initial_client_balance_sat: U64String;
  max_initial_client_balance_sat: U64String;
  min_initial_lsp_balance_sat: U64String;
  max_initial_lsp_balance_sat: U64String;
  min_channel_balance_sat: U64String;
  max_channel_balance_sat: U64String;
}

export interface Lsps2FeeOfferDto {
  min_fee_msat: U64String;
  proportional_ppm: number;
  valid_until: string;
  min_lifetime: number;
  max_client_to_self_delay: number;
  min_payment_size_msat: U64String;
  max_payment_size_msat: U64String;
}

export interface Lsps2InvoiceRequest {
  lsp_node_id: string;
  amount_msat?: U64String | null;
  max_fee?: U64String | null;
  description?: string;
  expiry_secs: number;
}

export interface Lsps2InvoiceResponse {
  invoice: string;
}

export interface Lsps2OptionsDto {
  require_token?: string | null;
  channel_opening_fee_ppm: number;
  channel_over_provisioning_ppm: number;
  min_channel_opening_fee_msat: U64String;
  min_channel_lifetime: number;
  max_client_to_self_delay: number;
  min_payment_size_msat: U64String;
  max_payment_size_msat: U64String;
  max_unpaid_channels_per_peer: number;
  max_unpaid_channels_total: number;
  unpaid_channel_close_secs: U64String;
}

export interface Lsps2OptionsResponse extends Lsps2OptionsDto {
  advertise_service: boolean;
}

export interface Lsps2QuoteRequest {
  lsp_node_id: string;
  amount_msat?: U64String | null;
}

export interface Lsps2QuoteResponse {
  offers: Lsps2FeeOfferDto[];
  fee_msat: U64String | null;
}

export interface Lsps2RgbAssetOfferDto {
  asset_id: string;
  ticker: string;
  precision: number;
  asset_unit_price_sat: U64String;
  asset_rent_ppm_per_year: number;
  min_lsp_asset_balance: U64String;
  max_lsp_asset_balance: U64String;
}

export interface Lsps2RgbFeeDto {
  fee_sat: U64String;
  onchain_cost_sat: U64String;
  btc_rent_sat: U64String;
  asset_rent_sat: U64String;
}

export interface Lsps2RgbInvoiceRequest extends Lsps2RgbQuoteRequest {
  max_fee_sat: U64String;
  description?: string;
  expiry_secs: number;
}

export interface Lsps2RgbInvoiceResponse {
  invoice: string;
  payment_hash: string;
  fee: Lsps2RgbFeeDto;
  amount_msat: U64String;
  expires_at_unix_secs: U64String;
  min_lifetime: number;
}

export interface Lsps2RgbOfferingDto {
  assets: Lsps2RgbAssetOfferDto[];
  btc_capacity_ppm_per_year: number;
  onchain_cost_sat: U64String;
  min_fee_sat: U64String;
  min_lsp_balance_sat: U64String;
  max_lsp_balance_sat: U64String;
  min_lifetime: number;
}

export interface Lsps2RgbQuoteRequest {
  lsp_node_id: string;
  contract_id: string;
  asset_amount: U64String;
  lsp_asset_balance: U64String;
  lsp_balance_sat: U64String;
  btc_carrier_amount_msat?: U64String | null;
}

export interface Lsps2RgbQuoteResponse {
  offering: Lsps2RgbOfferingDto;
  estimated_fee: Lsps2RgbFeeDto;
  min_btc_carrier_amount_msat: U64String;
  max_btc_carrier_amount_msat: U64String;
}

export interface NetworkGraphChannelInfoResponse {
  node_one: string;
  node_two: string;
  capacity_sats?: U64String | null;
  one_to_two?: ChannelUpdateInfoDto;
  two_to_one?: ChannelUpdateInfoDto;
}

export interface NetworkGraphChannelsResponse {
  channels: number[];
}

export interface NetworkGraphNodeInfoResponse {
  channels: number[];
  announcement_info?: NodeAnnouncementInfoDto;
}

export interface NetworkGraphNodesResponse {
  nodes: string[];
}

export interface NodeAnnouncementInfoDto {
  last_update: number;
  alias: string;
  addresses: string[];
}

export interface NodeIdResponse {
  node_id: string;
}

export interface OkResponse {
  ok: boolean;
  checks?: HealthCheckDto[];
}

export interface OpenChannelRequest {
  node_id: string;
  address: string;
  channel_amount_sats: U64String;
  push_to_counterparty_msat?: U64String | null;
  announce?: boolean | null;
  rgb?: RgbOpenChannelRequest | null;
}

export interface OpenChannelResponse {
  user_channel_id: string;
}

export interface OutPointDto {
  txid: string;
  vout: number;
}

export interface PaymentDetailsDto {
  id: string;
  direction: string;
  status: string;
  amount_msat?: U64String | null;
  kind: string;
  payment_hash?: string;
  htlc_locked: boolean;
  fee_paid_msat?: U64String | null;
  kind_details?: unknown;
}

export interface PaymentWaitRequest {
  timeout_secs?: number | null;
}

export interface PaymentWaitResponse {
  ok: boolean;
  payment: PaymentDetailsDto;
  checks?: HealthCheckDto[];
}

export interface PeerConnectRequest {
  node_id: string;
  address: string;
  persist?: boolean;
}

export interface PeerDetailsDto {
  node_id: string;
  address: string;
  is_persisted: boolean;
  is_connected: boolean;
}

export interface PeerDisconnectRequest {
  node_id: string;
}

export interface RgbAllocationDto {
  contract_id: string;
  amount: U64String;
  layer: string;
}

export interface RgbBalancesDto {
  l1: RgbL1BalanceDto[];
  l2: RgbL2BalanceDto[];
}

export interface RgbChannelBalanceDto {
  contract_id: string;
  local_amount: U64String;
  remote_amount: U64String;
}

export interface RgbContractBalanceDto {
  mined: U64String;
  tentative: U64String;
  offchain: U64String;
  archived: U64String;
  total: U64String;
}

export interface RgbContractBalanceResponse {
  contract_id: string;
  balance: RgbContractBalanceDto;
}

export interface RgbContractDto {
  contract_id: string;
  name?: string | null;
  ticker?: string | null;
  precision?: number | null;
  issued_supply?: U64String | null;
  details?: string | null;
}

export interface RgbContractKnownResponse {
  contract_id: string;
  known: boolean;
}

export interface RgbContractsExportRequest {
  contract_id: string;
}

export interface RgbContractsExportResponse {
  ok: boolean;
  contract_id: string;
  consignment_key: string;
  checks?: HealthCheckDto[];
}

export interface RgbContractsImportResponse {
  ok: boolean;
  contract_id: string;
  consignment_key: string;
  checks?: HealthCheckDto[];
}

export interface RgbContractsIssueRequest {
  issuer_name: string;
  contract_name: string;
  ticker?: string | null;
  precision?: number | null;
  issued_supply: U64String;
  utxo?: string | null;
}

export interface RgbContractsIssueResponse {
  ok: boolean;
  contract_id: string;
  issued_supply: U64String;
  checks?: HealthCheckDto[];
}

export interface RgbContractsResponse {
  contracts: RgbContractDto[];
}

export interface RgbDerivedDescriptorDto {
  fingerprint: string;
  derivation_path: string;
  xpub: string;
  descriptor: string;
}

export interface RgbDescriptorResponse {
  descriptor: string;
  derived_descriptors?: RgbDerivedDescriptorDto[];
}

export interface RgbFundingUtxoDto {
  txid: string;
  vout: number;
  role: RgbFundingUtxoRoleDto;
}

export interface RgbInvalidIssuerDto {
  name: string;
  error: string;
}

export interface RgbIssuersImportResponse {
  ok: boolean;
  issuer_name: string;
  checks?: HealthCheckDto[];
}

export interface RgbIssuersResponse {
  issuers: string[];
  invalid_issuers?: RgbInvalidIssuerDto[];
}

export interface RgbL1BalanceDto {
  contract_id: string;
  mined: U64String;
  tentative: U64String;
  offchain: U64String;
  archived: U64String;
  total: U64String;
}

export interface RgbL2BalanceDto {
  channel_id: string;
  contract_id: string;
  local_amount: U64String;
  remote_amount: U64String;
}

export interface RgbLnCarrierEstimateChannelDto {
  channel_id: string;
  user_channel_id: string;
  is_usable: boolean;
  inbound_capacity_msat: U64String;
  inbound_htlc_minimum_msat: U64String;
  inbound_htlc_maximum_msat?: U64String | null;
  local_balance_output_sats: U64String;
  has_holder_reserve: boolean;
  receive_available: boolean;
  can_receive_rgb_invoice?: boolean;
  blocking_reason?: string;
  required_carrier_msat?: U64String | null;
  required_carrier_reason?: string;
  available_inbound_capacity_msat?: U64String;
  suggested_action?: string;
  minimum_viable_carrier_amount_msat?: U64String | null;
  minimum_viable_reason?: string;
  default_create_carrier_amount_msat?: U64String | null;
  default_create_reason?: string;
}

export interface RgbLnCarrierEstimateResponse {
  receive_available: boolean;
  can_create_rgb_invoice?: boolean;
  blocking_reason?: string;
  required_carrier_msat?: U64String | null;
  required_carrier_reason?: string;
  available_inbound_capacity_msat?: U64String | null;
  suggested_action?: string;
  minimum_viable_carrier_amount_msat: U64String;
  minimum_viable_reason: string;
  default_create_carrier_amount_msat: U64String;
  default_create_reason: string;
  carrier_admission_threshold_msat: U64String;
  minimum_allowed_carrier_amount_msat: U64String;
  holder_reserve_threshold_msat: U64String;
  channels: RgbLnCarrierEstimateChannelDto[];
  estimate_only: boolean;
  warning: string;
}

export interface RgbLnInvoiceCreateForHashRequest {
  contract_id: string;
  asset_amount: U64String;
  payment_hash: string;
  description: string;
  expiry_secs?: number | null;
  btc_carrier_amount_msat?: U64String | null;
}

export interface RgbLnInvoiceCreateRequest {
  contract_id: string;
  asset_amount: U64String;
  description: string;
  expiry_secs?: number | null;
  btc_carrier_amount_msat?: U64String | null;
}

export interface RgbLnInvoiceDecodeRequest {
  invoice: string;
}

export interface RgbLnInvoiceDecodeResponse {
  payment_hash: string;
  destination: string;
  carrier_amount_msat?: U64String | null;
  expiry_secs: U64String;
  contract_id?: string | null;
  asset_amount?: U64String | null;
}

export interface RgbLnInvoiceResponse {
  invoice: string;
  btc_carrier_amount_msat: U64String;
}

export interface RgbLnPayRequest {
  invoice: string;
  contract_id?: string | null;
  asset_amount?: U64String | null;
}

export interface RgbNewAddressResponse {
  address: string;
}

export interface RgbOnchainInvoiceCreateRequest {
  contract_id: string;
  amount: U64String;
  expiry_secs?: U64String | null;
  use_witness_utxo?: boolean | null;
  nonce?: U64String | null;
  blinding_utxo?: string | null;
}

export interface RgbOnchainInvoiceDecodeRequest {
  invoice: string;
}

export interface RgbOnchainInvoiceDecodeResponse {
  contract_id: string;
  amount: U64String;
  beneficiary: string;
  use_witness_utxo: boolean;
  expiry_unix_secs?: U64String | null;
}

export interface RgbOnchainInvoiceResponse {
  invoice: string;
  blinding_utxo_used?: string | null;
}

export interface RgbOnchainPaymentDto {
  id: string;
  kind: string;
  status: string;
  created_at_unix_secs: U64String;
  latest_update_timestamp: U64String;
  expires_at_unix_secs?: U64String | null;
  invoice?: string | null;
  contract_id?: string | null;
  amount?: U64String | null;
  txid?: string | null;
  consignment_key?: string | null;
  consignment_download_path?: string | null;
  purpose?: string | null;
}

export interface RgbOnchainPaymentsResponse {
  payments: RgbOnchainPaymentDto[];
}

export interface RgbOnchainReceiveRequest {
  consignment_key: string;
  payment_id?: string | null;
  invoice?: string | null;
}

export interface RgbOnchainReceiveResponse {
  contract_id: string;
  amount: U64String;
}

export interface RgbOnchainSendRequest {
  invoice: string;
  sats_for_fee_and_outputs?: U64String | null;
  fee_rate_sats_per_vb: number;
}

export interface RgbOnchainSendResponse {
  txid: string;
  consignment_key: string;
}

export interface RgbOpenChannelRequest {
  contract_id: string;
  asset_amount: U64String;
  color_context_data: string;
  funding_utxo_policy?: RgbFundingUtxoPolicyDto | null;
  funding_utxos?: RgbFundingUtxoDto[] | null;
}

export interface RgbPaymentContextDto {
  contract_id: string;
  asset_amount: U64String;
  direction: string;
  is_swap: boolean;
}

export interface RgbSignMessageRequest {
  message: string;
  algorithm?: RgbSignMessageAlgorithmDto | null;
  compact?: boolean | null;
  encoding?: RgbSignMessageEncodingDto | null;
}

export interface RgbSignMessageResponse {
  message: string;
  algorithm: string;
  signature: string;
  encoding?: string;
  compact?: boolean;
  pubkey: string;
  derivation_path: string;
  digest_hex?: string;
}

export interface RgbUtxoAssetAllocationDto {
  contract_id: string;
  amount: U64String;
}

export interface RgbUtxoConfirmationDto {
  status: RgbUtxoConfirmationStatusDto;
  height?: number | null;
}

export interface RgbUtxoDto {
  outpoint: string;
  value_sats: U64String;
  confirmation: RgbUtxoConfirmationDto;
  rgb: RgbUtxoRgbDto;
  lock: RgbUtxoLockDto;
}

export interface RgbUtxoLockDto {
  locked: boolean;
  kind: RgbUtxoLockKindDto;
  operation_id?: string | null;
  expires_at_unix_secs?: U64String | null;
}

export interface RgbUtxoRgbDto {
  allocations: RgbAllocationDto[];
  has_mixed_asset_allocations: boolean;
  spend_roles: string[];
}

export interface RgbUtxoSummaryDto {
  outpoint: string;
  value_sats?: U64String | null;
  confirmed_height?: number | null;
  reserved: boolean;
  reserved_until_unix_secs?: U64String | null;
  assets?: RgbUtxoAssetAllocationDto[];
}

export interface RgbUtxosFundChangeDto {
  address: string;
  value_sats: U64String;
  vout: number;
}

export interface RgbUtxosFundCreatedOutputDto {
  address: string;
  value_sats: U64String;
  vout: number;
}

export interface RgbUtxosFundInputDto {
  outpoint: string;
}

export interface RgbUtxosFundOutputDto {
  address: string;
  value_sats: U64String;
}

export interface RgbUtxosFundRequest {
  inputs: RgbUtxosFundInputDto[];
  outputs: RgbUtxosFundOutputDto[];
  change_address: string;
  fee_rate_sats_per_vb: number;
}

export interface RgbUtxosFundResponse {
  txid: string;
  status: string;
  outputs: RgbUtxosFundCreatedOutputDto[];
  change?: RgbUtxosFundChangeDto | null;
  fee_sats: U64String;
}

export interface RgbUtxosMergeRequest {
  contract_id: string;
  destination_utxo: string;
  include_invoice_bound_utxos?: boolean | null;
  fee_rate_sats_per_vb?: number | null;
}

export interface RgbUtxosMergeResponse {
  operation_id: string;
  txid: string;
  merged_inputs: string[];
  total_amount: U64String;
  remaining_count: number;
  status: string;
  consignment_key: string;
}

export interface RgbUtxosMergeStatusEntryDto {
  txid: string;
  destination_utxo: string;
  contract_id?: string | null;
  status: string;
  confirmations: number;
  released: boolean;
}

export interface RgbUtxosMergeStatusResponse {
  merges: RgbUtxosMergeStatusEntryDto[];
}

export interface RgbUtxosReleaseRequest {
  reservation_id?: string | null;
  outpoint?: string | null;
}

export interface RgbUtxosReleaseResponse {
  released: boolean;
}

export interface RgbUtxosReserveRequest {
  outpoint?: string | null;
  ttl_secs?: U64String | null;
}

export interface RgbUtxosReserveResponse {
  reservation_id: string;
  outpoint: string;
  reserved_until_unix_secs: U64String;
}

export interface RgbUtxosResponse {
  utxos: RgbUtxoDto[];
}

export interface RgbUtxosSummaryResponse {
  utxos: RgbUtxoSummaryDto[];
}

export interface RgbUtxosSweepDestinationDto {
  address: string;
  value_sats: U64String;
  vout: number;
}

export interface RgbUtxosSweepInputDto {
  outpoint: string;
}

export interface RgbUtxosSweepRequest {
  input: RgbUtxosSweepInputDto;
  destination_address: string;
  fee_rate_sats_per_vb: number;
}

export interface RgbUtxosSweepResponse {
  txid: string;
  status: string;
  input: RgbUtxosSweepInputDto;
  destination: RgbUtxosSweepDestinationDto;
  fee_sats: U64String;
}

export interface RgbUtxosTopUpChangeDto {
  address: string;
  value_sats: U64String;
  vout: number;
}

export interface RgbUtxosTopUpCreatedOutputDto {
  address: string;
  value_sats: U64String;
  vout: number;
}

export interface RgbUtxosTopUpL1InputDto {
  outpoint: string;
}

export interface RgbUtxosTopUpRequest {
  rgb_input: RgbUtxosTopUpRgbInputDto;
  l1_inputs: RgbUtxosTopUpL1InputDto[];
  rgb_output: RgbUtxosTopUpRgbOutputDto;
  change_address: string;
  fee_rate_sats_per_vb: number;
}

export interface RgbUtxosTopUpResponse {
  txid: string;
  status: string;
  old_outpoint: string;
  new_rgb_output: RgbUtxosTopUpCreatedOutputDto;
  change?: RgbUtxosTopUpChangeDto | null;
  fee_sats: U64String;
  consignment_key: string;
}

export interface RgbUtxosTopUpRgbInputDto {
  outpoint: string;
}

export interface RgbUtxosTopUpRgbOutputDto {
  address: string;
  target_value_sats: U64String;
}

export interface RouteEdge {
  node_id: string;
  channel_scid: U64String;
}

export interface RoutingConstraints {
  maker_to_taker: LegConstraints;
  taker_to_maker: LegConstraints;
  max_total_cltv_delta: number;
}

export interface SendAttempt {
  plan_version: U64String;
  status: AttemptStatus;
}

export interface SendResponse {
  payment_id: string;
}

export interface SpliceInRequest {
  user_channel_id: string;
  counterparty_node_id: string;
  splice_amount_sats: U64String;
}

export interface SpliceOutRequest {
  user_channel_id: string;
  counterparty_node_id: string;
  address: string;
  splice_amount_sats: U64String;
}

export interface SpontaneousSendRequest {
  counterparty_node_id: string;
  amount_msat: U64String;
  custom_tlvs?: CustomTlvDto[];
}

export interface StatusDto {
  is_running: boolean;
  is_listening: boolean;
  best_block_height: number;
}

export interface SwapCreateMultihopOfferRequest {
  policy_hints?: DirectionalPolicy[];
  constraints?: RoutingConstraints | null;
  maker_to_taker: SwapHopDto[];
  taker_to_maker: SwapHopDto[];
  contract_id: string;
  asset_amount: U64String;
  btc_amount_msat: U64String;
  btc_carrier_amount_msat: U64String;
  maker_gives_rgb: boolean;
  expiry_secs: number;
}

export interface SwapCreateOfferRequest {
  counterparty_node_id: string;
  channel_scid: U64String;
  contract_id: string;
  asset_amount: U64String;
  btc_amount_msat: U64String;
  btc_carrier_amount_msat: U64String;
  maker_gives_rgb: boolean;
  expiry_secs: number;
}

export interface SwapExecuteRequest {
  policy_hints?: DirectionalPolicy[];
  swap_string?: string;
  execution_id?: string;
  maker_to_taker?: SwapHopDto[];
  taker_to_maker?: SwapHopDto[];
  force?: boolean;
}

export interface SwapExecuteResponse {
  execution_id: string;
  ok: boolean;
  payment_hash: string;
  status: string;
}

export interface SwapExecution {
  format_version: number;
  policy_hints?: DirectionalPolicy[];
  quote: SwapQuote;
  maker_to_taker: RouteEdge[];
  taker_to_maker: RouteEdge[];
  selected_plan: U64String | null;
  plans: ExecutionPlan[];
  attempts: SendAttempt[];
}

export interface SwapHopDto {
  node_id: string;
  channel_scid: U64String;
}

export interface SwapInfoDto {
  execution_id: string;
  execution?: SwapExecution;
  payment_hash: string;
  role: string;
  status: string;
  counterparty_node_id: string;
  channel_scid: U64String;
  contract_id: string;
  asset_amount: U64String;
  btc_amount_msat: U64String;
  btc_carrier_amount_msat: U64String;
  maker_gives_rgb: boolean;
  expiry_secs: number;
  created_at_unix_secs: U64String;
  is_multihop: boolean;
  last_error?: string;
}

export interface SwapOfferResponse {
  execution_id: string;
  swap_string: string;
  payment_hash: string;
  info: SwapInfoDto;
}

export interface SwapQuote {
  execution_id: string;
  maker: string;
  taker: string;
  taker_outbound_channel_scid: U64String;
  asset_id: number[];
  asset_amount: U64String;
  btc_amount_msat: U64String;
  btc_carrier_amount_msat: U64String;
  maker_gives_rgb: boolean;
  created_at_unix_secs: U64String;
  expiry_secs: number;
  settlement_mode: SettlementMode;
  maker_to_taker_fee_payer: FeePayer;
  taker_to_maker_fee_payer: FeePayer;
  constraints: RoutingConstraints;
}

export interface SwapStringRequest {
  swap_string: string;
}

export interface SwapValidationErrorResponse {
  error: string;
  code: string;
  message: string;
  details: SwapFailureDetails;
  context?: SwapFailureDetails[];
}

export interface VersionResponse {
  api_version: string;
  api_crate_version: string;
  core_crate_version: string;
}

export interface WalletNewAddressResponse {
  address: string;
}

export interface WalletSendAllRequest {
  address: string;
  retain_reserves: boolean;
  fee_rate_sats_per_vb?: number | null;
}

export interface WalletSendRequest {
  address: string;
  amount_sats: U64String;
  fee_rate_sats_per_vb?: number | null;
}

export interface WalletSendResponse {
  txid: string;
}

export interface WalletUtxoConfirmationDto {
  status: WalletUtxoConfirmationStatusDto;
  height?: number | null;
}

export interface WalletUtxoDto {
  outpoint: string;
  value_sats: U64String;
  confirmation: WalletUtxoConfirmationDto;
  lock: WalletUtxoLockDto;
}

export interface WalletUtxoLockDto {
  locked: boolean;
  kind: WalletUtxoLockKindDto;
  operation_id?: string | null;
  expires_at_unix_secs?: U64String | null;
}

export interface WalletUtxoLockStatusDto {
  operation_id: string;
  purpose: WalletUtxoLockPurposeDto;
  expires_at_unix_secs?: U64String | null;
}

export interface WalletUtxoOperationDto {
  operation_id: string;
  phase: WalletUtxoOperationPhaseDto;
}

export interface WalletUtxoStatusDto {
  outpoint: string;
  account_id: string;
  scope_id: string;
  value_sats: U64String;
  onchain_state: WalletUtxoOnchainStateDto;
  availability: WalletUtxoAvailabilityDto;
  selectable: boolean;
  operation?: WalletUtxoOperationDto;
  lock?: WalletUtxoLockStatusDto;
  unavailable_reason?: string;
}

export interface WalletUtxosResponse {
  utxos: WalletUtxoDto[];
}

export type AttemptStatus = "Prepared" | "Submitted" | "SendRejected";

export type ClosingChannelStatusDto = "negotiating" | "broadcasting" | "confirming" | "contested" | "sweeping";

export type ClosingSourceDto = "coop" | "holder_force" | "counterparty_force" | "unknown";

export type EventDto =
  | { type: "PaymentSuccessful"; data: {
      payment_id?: string | null;
      fee_paid_msat?: U64String | null;
    }; }
  | { type: "PaymentFailed"; data: {
      payment_id?: string | null;
      reason?: string;
    }; }
  | { type: "PaymentReceived"; data: {
      payment_id?: string | null;
      payment_hash: string;
      amount_msat: U64String;
      custom_records?: CustomTlvDto[];
      rgb?: RgbPaymentContextDto;
    }; }
  | { type: "ChannelPending"; data: {
      funding_txo: OutPointDto;
    }; }
  | { type: "ChannelReady"; data: {
      user_channel_id: string;
    }; }
  | { type: "ChannelClosed"; data: {
      channel_id: string;
      user_channel_id: string;
      counterparty_node_id?: string;
      reason?: string;
    }; }
  | { type: "SplicePending"; data: {
      channel_id: string;
      user_channel_id: string;
      counterparty_node_id: string;
      new_funding_txo: OutPointDto;
    }; }
  | { type: "SpliceFailed"; data: {
      channel_id: string;
      user_channel_id: string;
      counterparty_node_id: string;
      abandoned_funding_txo?: OutPointDto;
    }; }
  | { type: "Other"; data: {
      kind: string;
    }; }
;

export type FeePayer = "Maker";

export type LegAsset =
  | "Btc"
  | { "Rgb": {
    asset_id: number[];
  } }
;

export type LegDirection = "MakerToTaker" | "TakerToMaker";

export type MainStatusResponse =
  | StatusDto
  | LockedStatusDto
;

export type RgbFundingUtxoPolicyDto = "single-rgb-anchor" | "rgb-anchor-with-btc-support" | "merge-rgb-anchors-with-btc-support";

export type RgbFundingUtxoRoleDto = "rgb-state" | "fee-support";

export type RgbSignMessageAlgorithmDto = "bitcoin_signed_message" | "ecdsa";

export type RgbSignMessageEncodingDto = "hex" | "base64";

export type RgbSweepStatusDto = "parked" | "in_flight" | "done";

export type RgbUtxoConfirmationStatusDto = "confirmed" | "mempool";

export type RgbUtxoLockKindDto = "none" | "manual_reservation" | "operation";

export type SettlementMode = "CircularHtlc";

export type SwapFailureDetails =
  | { "kind": "format_version";
      "actual_version": number;
      "supported_version": number;
    }
  | { "kind": "quote_comparison";
      "expected": SwapQuote;
      "actual": SwapQuote;
    }
  | { "kind": "plan_comparison";
      "expected": ExecutionPlan;
      "actual": ExecutionPlan;
    }
  | { "kind": "plan_selection";
      "expected_quote": SwapQuote;
      "actual_quote": SwapQuote;
      "expected_version": number;
      "actual_version": U64String;
    }
  | { "kind": "policy_binding";
      "hop_index": number;
      "expected_source": string;
      "expected_edge": RouteEdge;
      "policy": DirectionalPolicy;
    }
  | { "kind": "forwarding_fee";
      "amount_msat": U64String;
      "base_fee_msat": number;
      "fee_proportional_millionths": number;
    }
  | { "kind": "onion_hop";
      "hop_index": number;
      "channel_scid": U64String;
      "expected_btc_msat": U64String;
      "actual_btc_msat": U64String;
      "expected_cltv_delta": number;
      "actual_cltv_delta": number;
      "expected_rgb_amount": U64String | null;
      "actual_rgb_amount": U64String | null;
    }
  | { "kind": "channel_capacity";
      "channel_scid": U64String;
      "counterparty_node_id": string;
      "is_usable": boolean;
      "outbound_capacity_msat": U64String;
      "inbound_capacity_msat": U64String;
      "rgb_outbound_limit": U64String | null;
      "rgb_inbound_limit": U64String | null;
      "required_outbound_msat": U64String | null;
      "required_inbound_msat": U64String | null;
      "required_rgb_amount": U64String | null;
    }
  | { "kind": "channel_policy";
      "leg": LegDirection;
      "hop_index": number;
      "btc_amount_msat": U64String;
      "rgb_amount": U64String | null;
      "expected_asset_id": number[];
      "policy": DirectionalPolicy;
    }
  | { "kind": "route_constraints";
      "leg": LegDirection;
      "actual_route": RouteEdge[];
      "required": LegConstraints;
    }
  | { "kind": "route_binding";
      "minimum_carrier_msat": U64String;
      "minimum_total_cltv_delta": number;
      "maximum_total_cltv_delta": number;
      "maximum_hops": number;
      "quote": SwapQuote;
      "maker_to_taker": RouteEdge[];
      "taker_to_maker": RouteEdge[];
    }
  | { "kind": "cltv_limit";
      "actual_total_cltv_delta": number;
      "max_total_cltv_delta": number;
      "protocol_max_exclusive": number;
    }
  | { "kind": "channel_lookup";
      "leg": LegDirection;
      "hop_index": number;
      "source": string;
      "destination": string;
      "channel_scid": U64String;
    }
  | { "kind": "policy_count";
      "expected": number;
      "actual": number;
    }
  | { "kind": "arithmetic";
      "operation": string;
      "left": U64String;
      "right": U64String;
    }
;

export type WalletUtxoAvailabilityDto = "blocked_by_policy" | "blocked_by_spend" | "locked" | "recovering" | "reserved" | "selectable" | "unknown";

export type WalletUtxoConfirmationStatusDto = "confirmed" | "mempool";

export type WalletUtxoLockKindDto = "none" | "manual_reservation" | "operation";

export type WalletUtxoLockPurposeDto = "btc_send" | "fee_support" | "manual_reservation" | "planned_selection";

export type WalletUtxoOnchainStateDto = "confirmed" | "spending_in_flight" | "spent" | "unconfirmed_incoming" | "unknown";

export type WalletUtxoOperationPhaseDto = "awaiting_confirmation" | "broadcast" | "constructing" | "rolling_back" | "selected" | "signed";