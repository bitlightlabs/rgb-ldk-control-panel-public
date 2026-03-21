use crate::{context_store::NodeContext, error::CommandError};
use reqwest::Url;
use serde::{Deserialize, Serialize};
use std::{path::Path};

mod serde_u64_decimal_string {
	use serde::de::Error;
	use serde::{Deserialize, Deserializer, Serializer};

	pub fn serialize<S>(v: &u64, s: S) -> Result<S::Ok, S::Error>
	where
		S: Serializer,
	{
		s.serialize_str(&v.to_string())
	}

	pub fn deserialize<'de, D>(d: D) -> Result<u64, D::Error>
	where
		D: Deserializer<'de>,
	{
		let s = String::deserialize(d)?;
		s.parse::<u64>().map_err(D::Error::custom)
	}
}

mod serde_opt_u64_decimal_string {
	use serde::de::Error;
	use serde::{Deserialize, Deserializer, Serializer};

	pub fn serialize<S>(v: &Option<u64>, s: S) -> Result<S::Ok, S::Error>
	where
		S: Serializer,
	{
		match v {
			Some(n) => s.serialize_some(&n.to_string()),
			None => s.serialize_none(),
		}
	}

	pub fn deserialize<'de, D>(d: D) -> Result<Option<u64>, D::Error>
	where
		D: Deserializer<'de>,
	{
		let opt = Option::<String>::deserialize(d)?;
		match opt {
			Some(s) => Ok(Some(s.parse::<u64>().map_err(D::Error::custom)?)),
			None => Ok(None),
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbOnchainTransferConsignment {
    pub archive_base64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbIssuersImportResponse {
	pub ok: bool,
	pub issuer_name: String,
	#[serde(default)]
	pub checks: Vec<HealthCheckDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbIssuersResponse {
	pub issuers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbOnchainInvoiceCreateRequest {
	pub contract_id: String,
	#[serde(with = "serde_u64_decimal_string")]
	pub amount: u64,
	#[serde(default)]
	pub use_witness_utxo: bool,
	#[serde(default, with = "serde_opt_u64_decimal_string")]
	pub nonce: Option<u64>,
	/// Outpoint used for blinding when `use_witness_utxo=false`.
	///
	/// If omitted and `use_witness_utxo=false`, the node will auto-select a wallet UTXO.
	#[serde(default)]
	pub blinding_utxo: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbOnchainInvoiceResponse {
	pub invoice: String,
	/// Outpoint actually used for blinding when creating a blinded invoice (`use_witness_utxo=false`).
	#[serde(default)]
	pub blinding_utxo_used: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbOnchainInvoiceDecodeRequest {
	pub invoice: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbOnchainInvoiceDecodeResponse {
	pub contract_id: String,
	#[serde(with = "serde_u64_decimal_string")]
	pub amount: u64,
	pub beneficiary: String,
	pub use_witness_utxo: bool,
	#[serde(default, with = "serde_opt_u64_decimal_string")]
	pub expiry_unix_secs: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbOnchainSendRequest {
	pub invoice: String,
	#[serde(default, with = "serde_opt_u64_decimal_string")]
	pub sats_for_fee_and_outputs: Option<u64>,
	pub fee_rate_sats_per_vb: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbOnchainSendResponse {
	pub txid: String,
	pub consignment_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbOnchainReceiveResponse {
	pub asset_id: String,
	#[serde(with = "serde_u64_decimal_string")]
	pub amount: u64,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbUtxosSummaryResponse {
    pub utxos: Vec<RgbUtxoSummaryDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbUtxoSummaryDto {
    /// Outpoint formatted as `txid:vout`.
    pub outpoint: String,
    /// BTC value of the output (sats), if available from the configured chain source.
    #[serde(default, with = "serde_opt_u64_decimal_string")]
    pub value_sats: Option<u64>,
    /// Confirmation block height, if known (confirmed only).
    #[serde(default)]
    pub confirmed_height: Option<u32>,
    /// Whether this outpoint is currently reserved by the node.
    pub reserved: bool,
    /// Reservation expiry (unix seconds), if reserved.
    #[serde(default, with = "serde_opt_u64_decimal_string")]
    pub reserved_until_unix_secs: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheckDto {
	pub name: String,
	pub ok: bool,
	pub detail: Option<String>,
	pub hint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OkResponse {
	pub ok: bool,
	pub checks: Option<Vec<HealthCheckDto>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionResponse {
	pub api_version: String,
	pub api_crate_version: String,
	pub core_crate_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeIdResponse {
	pub node_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListeningAddressesResponse {
	pub addresses: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerDetailsDto {
	pub node_id: String,
	pub address: String,
	pub is_persisted: bool,
	pub is_connected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerConnectRequest {
	pub node_id: String,
	pub address: String,
	#[serde(default)]
	pub persist: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerDisconnectRequest {
	pub node_id: String,
}


/// Wallet and channel balance overview (BTC + RGB).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalancesDto {
	pub btc: BtcBalancesDto,
	pub rgb: RgbBalancesDto,
}

/// Bitcoin (BTC) balance overview.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BtcBalancesDto {
	/// Total confirmed on-chain balance in satoshis.
	#[serde(with = "serde_u64_decimal_string")]
	pub onchain_total_sats: u64,
	/// Spendable on-chain balance in satoshis.
	#[serde(with = "serde_u64_decimal_string")]
	pub onchain_spendable_sats: u64,
	/// Sum of sats reserved for anchor channels.
	#[serde(with = "serde_u64_decimal_string")]
	pub anchor_channels_reserve_sats: u64,
	/// Total claimable Lightning balance in satoshis.
	#[serde(with = "serde_u64_decimal_string")]
	pub lightning_total_sats: u64,
}

/// RGB balance overview, split by asset location.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbBalancesDto {
	/// L1 (on-chain) RGB balances by contract.
	pub l1: Vec<RgbL1BalanceDto>,
	/// L2 (Lightning channel) RGB balances by channel.
	pub l2: Vec<RgbL2BalanceDto>,
}

/// L1 RGB balance for a single contract.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbL1BalanceDto {
	/// Contract ID (string like `contract:...`).
	pub contract_id: String,
	/// Asset ID (hex-encoded 32 bytes).
	pub asset_id: String,
	/// Confirmed on-chain balance.
	#[serde(with = "serde_u64_decimal_string")]
	pub mined: u64,
	/// Unconfirmed (tentative) on-chain balance.
	#[serde(with = "serde_u64_decimal_string")]
	pub tentative: u64,
	/// Off-chain balance tracked by the RGB wallet.
	#[serde(with = "serde_u64_decimal_string")]
	pub offchain: u64,
	/// Archived balance (historical, not spendable).
	#[serde(with = "serde_u64_decimal_string")]
	pub archived: u64,
	/// Total of mined + tentative + offchain.
	#[serde(with = "serde_u64_decimal_string")]
	pub total: u64,
}

/// L2 RGB balance for a single channel.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbL2BalanceDto {
	/// Channel id (32-byte hex).
	pub channel_id: String,
	/// Asset ID (hex-encoded 32 bytes).
	pub asset_id: String,
	/// Local (our) RGB balance in this channel.
	#[serde(with = "serde_u64_decimal_string")]
	pub local_amount: u64,
	/// Remote (counterparty) RGB balance in this channel.
	#[serde(with = "serde_u64_decimal_string")]
	pub remote_amount: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletNewAddressResponse {
	pub address: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbContractsIssueRequest {
	pub issuer_name: String,
	pub contract_name: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub ticker: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub precision: Option<u8>,
	pub issued_supply: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub utxo: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbContractsIssueResponse {
	pub ok: bool,
	pub contract_id: String,
	pub asset_id: String,
	pub issued_supply: String,
	pub checks: Option<Vec<HealthCheckDto>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbContractDto {
	pub contract_id: String,
	pub asset_id: String,
	pub name: Option<String>,
	pub ticker: Option<String>,
	pub precision: Option<u8>,
	pub issued_supply: Option<String>,
	pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbContractsResponse {
	pub contracts: Vec<RgbContractDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbContractsExportRequest {
	pub contract_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbContractsExportResponse {
	pub ok: bool,
	pub contract_id: String,
	pub consignment_key: String,
	pub checks: Option<Vec<HealthCheckDto>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbContractsImportResponse {
	pub ok: bool,
	pub contract_id: String,
	pub consignment_key: String,
	pub checks: Option<Vec<HealthCheckDto>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbContractsExportBundle {
	pub contract_id: String,
	pub consignment_key: String,
	pub archive_base64: String,
	pub format: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferConsignment {
	pub archive_base64: String,
	pub format: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbContractBalanceDto {
	pub mined: String,
	pub tentative: String,
	pub offchain: String,
	pub archived: String,
	pub total: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbContractBalanceResponse {
	pub contract_id: String,
	pub balance: RgbContractBalanceDto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbLnInvoiceCreateRequest {
	pub asset_id: String,
	pub asset_amount: String,
	pub description: String,
	pub expiry_secs: u32,
	pub btc_carrier_amount_msat: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbLnInvoiceResponse {
	pub invoice: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbLnPayRequest {
	pub invoice: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub asset_id: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub asset_amount: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbChannelBalanceDto {
	pub asset_id: String,
	pub local_amount: String,
	pub remote_amount: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelDetailsExtendedDto {
	pub channel_id: String,
	pub user_channel_id: String,
	pub counterparty_node_id: String,
	pub channel_point: Option<String>,
	pub channel_value_sats: String,
	pub outbound_capacity_msat: String,
	pub inbound_capacity_msat: String,
	pub local_balance_msat: Option<String>,
	pub remote_balance_msat: Option<String>,
	pub local_unspendable_punishment_reserve_sats: Option<String>,
	pub remote_unspendable_punishment_reserve_sats: String,
	pub is_channel_ready: bool,
	pub is_usable: bool,
	pub is_announced: bool,
	pub rgb_balance: Option<RgbChannelBalanceDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenChannelRequest {
	pub node_id: String,
	pub address: String,
	pub channel_amount_sats: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub push_to_counterparty_msat: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub announce: Option<bool>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub rgb: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenChannelResponse {
	pub user_channel_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt11ReceiveRequest {
	pub amount_msat: String,
	pub description: String,
	pub expiry_secs: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt11ReceiveVarRequest {
	pub description: String,
	pub expiry_secs: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt11ReceiveResponse {
	pub invoice: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt11SendRequest {
	pub invoice: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt11SendUsingAmountRequest {
	pub invoice: String,
	pub amount_msat: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendResponse {
	pub payment_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt11PayRequest {
	pub invoice: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub amount_msat: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt11DecodeRequest {
	pub invoice: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt11DecodeResponse {
	pub payment_hash: String,
	pub destination: String,
	pub amount_msat: Option<String>,
	pub expiry_secs: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt11PayResponse {
	pub payment_id: String,
	pub preimage: String,
	pub amount_sats: String,
	pub destination: String,
	pub fee_paid_msat: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt12OfferReceiveRequest {
	pub amount_msat: String,
	pub description: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub expiry_secs: Option<u32>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub quantity: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt12OfferReceiveVarRequest {
	pub description: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub expiry_secs: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt12OfferResponse {
	pub offer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt12OfferDecodeRequest {
	pub offer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt12OfferDecodeResponse {
	pub offer_id: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub signing_pubkey: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub description: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub issuer: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub amount_msat: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub absolute_expiry_unix_secs: Option<String>,
	pub chain_hashes: Vec<String>,
	pub paths_count: u32,
	pub expects_quantity: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt12OfferSendRequest {
	pub offer: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub amount_msat: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub quantity: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub payer_note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt12RefundInitiateRequest {
	pub amount_msat: String,
	pub expiry_secs: u32,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub quantity: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub payer_note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt12RefundInitiateResponse {
	pub refund: String,
	pub payment_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt12RefundDecodeRequest {
	pub refund: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt12RefundDecodeResponse {
	pub description: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub issuer: Option<String>,
	pub amount_msat: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub absolute_expiry_unix_secs: Option<String>,
	pub chain_hash: String,
	pub payer_signing_pubkey: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub payer_note: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub quantity: Option<String>,
	pub paths_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt12RefundRequestPaymentRequest {
	pub refund: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bolt12RefundRequestPaymentResponse {
	pub invoice: String,
	pub invoice_hex: String,
	pub payment_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentDetailsDto {
	pub id: String,
	pub direction: String,
	pub status: String,
	pub amount_msat: Option<String>,
	pub kind: String,
	pub fee_paid_msat: Option<String>,
	#[serde(default)]
	pub kind_details: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbOnchainPaymentsResponse {
	pub payments: Vec<RgbOnchainPaymentDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbOnchainPaymentDto {
	pub id: String,
	/// One of: invoice_created | onchain_sent | onchain_received
	pub kind: String,
	/// One of: pending | succeeded | failed | expired
	pub status: String,
	#[serde(with = "serde_u64_decimal_string")]
	pub created_at_unix_secs: u64,
	#[serde(with = "serde_u64_decimal_string")]
	pub latest_update_timestamp: u64,
	#[serde(default, with = "serde_opt_u64_decimal_string")]
	pub expires_at_unix_secs: Option<u64>,

	// Common payload fields (vary by kind)
	#[serde(default)]
	pub invoice: Option<String>,
	#[serde(default)]
	pub contract_id: Option<String>,
	#[serde(default, with = "serde_opt_u64_decimal_string")]
	pub amount: Option<u64>,
	#[serde(default)]
	pub txid: Option<String>,
	#[serde(default)]
	pub consignment_key: Option<String>,
	#[serde(default)]
	pub consignment_download_path: Option<String>,
	#[serde(default)]
	pub asset_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentWaitRequest {
	#[serde(skip_serializing_if = "Option::is_none")]
	pub timeout_secs: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentWaitResponse {
	pub ok: bool,
	pub payment: PaymentDetailsDto,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub checks: Option<Vec<HealthCheckDto>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloseChannelRequest {
	pub user_channel_id: String,
	pub counterparty_node_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusDto {
	pub is_running: bool,
	pub is_listening: bool,
	pub best_block_height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LockedStatusDto {
	pub ok: bool,
	pub locked: bool,
	pub running: bool,
	pub checks: Option<Vec<HealthCheckDto>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MainStatusResponse {
	Unlocked(StatusDto),
	Locked(LockedStatusDto),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ControlStatusDto {
	pub ok: bool,
	pub locked: bool,
	pub running: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutPointDto {
	pub txid: String,
	pub vout: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum EventDto {
	PaymentSuccessful {
		payment_id: Option<String>,
		fee_paid_msat: Option<String>,
	},
	PaymentFailed {
		payment_id: Option<String>,
	},
	PaymentReceived {
		payment_id: Option<String>,
		amount_msat: String,
	},
	ChannelPending {
		funding_txo: OutPointDto,
	},
	ChannelReady {
		user_channel_id: String,
	},
	ChannelClosed {
		channel_id: String,
		user_channel_id: String,
		counterparty_node_id: Option<String>,
		reason: Option<String>,
	},
	Other {
		kind: String,
	},
	NodeHttp {
		action: String,
		phase: String,
		#[serde(skip_serializing_if = "Option::is_none")]
		duration_ms: Option<u64>,
		#[serde(skip_serializing_if = "Option::is_none")]
		request: Option<serde_json::Value>,
		#[serde(skip_serializing_if = "Option::is_none")]
		response: Option<serde_json::Value>,
		#[serde(skip_serializing_if = "Option::is_none")]
		error: Option<serde_json::Value>,
	},
}

fn parse_base_url(url: &str) -> Result<Url, CommandError> {
	let mut s = url.trim().to_string();
	if !s.ends_with('/') {
		s.push('/');
	}
	Url::parse(&s).map_err(|_| CommandError::InvalidBaseUrl { url: url.to_string() })
}

fn read_token_file(path: &Path) -> Result<String, CommandError> {
	let raw = std::fs::read_to_string(path).map_err(|_| CommandError::TokenFileReadFailed {
		path: path.to_path_buf(),
	})?;
	let token = raw.trim().to_string();
	if token.is_empty() {
		return Err(CommandError::TokenFileReadFailed {
			path: path.to_path_buf(),
		});
	}
	Ok(token)
}

fn extract_error_and_hint(body: &str) -> (Option<String>, Option<String>) {
	let Ok(v) = serde_json::from_str::<serde_json::Value>(body) else {
		return (None, None);
	};
	let err = v
		.get("error")
		.and_then(|x| x.as_str())
		.map(|s| s.to_string());
	let hint = v
		.get("hint")
		.and_then(|x| x.as_str())
		.map(|s| s.to_string());
	(err, hint)
}

pub async fn classify_non_success(
	service: &'static str,
	resp: reqwest::Response,
) -> Result<CommandError, CommandError> {
	let status = resp.status().as_u16();
	let body = resp.text().await.unwrap_or_default();
	let (err, hint) = extract_error_and_hint(&body);

	let err = err.or_else(|| {
		if body.trim().is_empty() {
			None
		} else {
			Some(body.trim().to_string())
		}
	});

	let e = match status {
		400 => CommandError::BadRequest {
			service,
			message: err,
			hint,
		},
		408 => CommandError::RequestTimeout {
			service,
			message: err,
			hint: hint.or_else(|| Some("Try again, or use payment wait + events to observe progress.".to_string())),
		},
		401 => CommandError::Unauthorized {
			service,
			message: err,
			hint: hint.or_else(|| Some("Verify the bearer token is configured and correct.".to_string())),
		},
		403 => CommandError::Forbidden {
			service,
			message: err,
			hint,
		},
		503 => CommandError::ServiceUnavailable {
			service,
			message: err,
			hint: hint.or_else(|| Some("Check the daemon is running and ready.".to_string())),
		},
		423 => CommandError::NodeLocked,
		_ => CommandError::UnexpectedHttpStatus { service, status },
	};
	Ok(e)
}

pub async fn main_status(
	client: &reqwest::Client,
	ctx: &NodeContext,
) -> Result<MainStatusResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/status").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.get(url);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<MainStatusResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn main_version(
	client: &reqwest::Client,
	ctx: &NodeContext,
) -> Result<VersionResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/version").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.get(url);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<VersionResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn main_node_id(
	client: &reqwest::Client,
	ctx: &NodeContext,
) -> Result<NodeIdResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/node_id").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.get(url);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<NodeIdResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn main_listening_addresses(
	client: &reqwest::Client,
	ctx: &NodeContext,
) -> Result<ListeningAddressesResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/listening_addresses").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.get(url);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<ListeningAddressesResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn main_peers(
	client: &reqwest::Client,
	ctx: &NodeContext,
) -> Result<Vec<PeerDetailsDto>, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/peers").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.get(url);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<Vec<PeerDetailsDto>>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn main_peers_connect(
	client: &reqwest::Client,
	ctx: &NodeContext,
	body: PeerConnectRequest,
) -> Result<OkResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base
		.join("api/v1/peers/connect")
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		})?;

	let mut req = client.post(url).json(&body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<OkResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn main_peers_disconnect(
	client: &reqwest::Client,
	ctx: &NodeContext,
	body: PeerDisconnectRequest,
) -> Result<OkResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base
		.join("api/v1/peers/disconnect")
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		})?;

	let mut req = client.post(url).json(&body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<OkResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn main_balances(client: &reqwest::Client, ctx: &NodeContext) -> Result<BalancesDto, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/balances").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.get(url);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<BalancesDto>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn wallet_new_address(
	client: &reqwest::Client,
	ctx: &NodeContext,
) -> Result<WalletNewAddressResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base
		.join("api/v1/wallet/new_address")
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		})?;

	let mut req = client.post(url).json(&serde_json::json!({}));
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<WalletNewAddressResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn wallet_sync(client: &reqwest::Client, ctx: &NodeContext) -> Result<OkResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/wallet/sync").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&serde_json::json!({}));
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<OkResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn rgb_sync(client: &reqwest::Client, ctx: &NodeContext) -> Result<OkResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/rgb/sync").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&serde_json::json!({}));
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<OkResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn rgb_contracts(client: &reqwest::Client, ctx: &NodeContext) -> Result<RgbContractsResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/rgb/contracts").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.get(url);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<RgbContractsResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn rgb_contract_issue(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: RgbContractsIssueRequest,
) -> Result<RgbContractsIssueResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/rgb/contracts/issue").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<RgbContractsIssueResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn rgb_contract_export(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: RgbContractsExportRequest,
) -> Result<RgbContractsExportResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/rgb/contracts/export").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<RgbContractsExportResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn rgb_consignment_download(
	client: &reqwest::Client,
	ctx: &NodeContext,
	consignment_key: &str,
	format: &str,
) -> Result<Vec<u8>, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base
		.join(&format!("api/v1/rgb/consignments/{consignment_key}?format={format}"))
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		})?;

	let mut req = client.get(url);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	let bytes = resp.bytes().await.map_err(|_| CommandError::HttpRequestFailed)?;
	Ok(bytes.to_vec())
}

pub async fn rgb_contract_import(
	client: &reqwest::Client,
	ctx: &NodeContext,
	contract_id: &str,
	format: &str,
	archive: &[u8],
) -> Result<RgbContractsImportResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base
		.join(&format!(
			"api/v1/rgb/contracts/import?contract_id={contract_id}&format={format}"
		))
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		})?;

	let mut req = client
		.post(url)
		.header("Content-Type", "application/octet-stream")
		.body(archive.to_vec());
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<RgbContractsImportResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn rgb_contract_balance(
	client: &reqwest::Client,
	ctx: &NodeContext,
	contract_id: &str,
) -> Result<RgbContractBalanceResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base
		.join(&format!("api/v1/rgb/contract/{contract_id}/balance"))
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		})?;

	let mut req = client.get(url);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<RgbContractBalanceResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn rgb_ln_invoice_create(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: RgbLnInvoiceCreateRequest,
) -> Result<RgbLnInvoiceResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/rgb/ln/invoice/create").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<RgbLnInvoiceResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn rgb_ln_pay(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: RgbLnPayRequest,
) -> Result<SendResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/rgb/ln/pay").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<SendResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn main_channels(
	client: &reqwest::Client,
	ctx: &NodeContext,
) -> Result<Vec<ChannelDetailsExtendedDto>, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/channels").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.get(url);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<Vec<ChannelDetailsExtendedDto>>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn channel_open(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: OpenChannelRequest,
) -> Result<OpenChannelResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/channel/open").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<OpenChannelResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn bolt11_receive(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: Bolt11ReceiveRequest,
) -> Result<Bolt11ReceiveResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/bolt11/receive").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<Bolt11ReceiveResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn bolt11_receive_var(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: Bolt11ReceiveVarRequest,
) -> Result<Bolt11ReceiveResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/bolt11/receive_var").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<Bolt11ReceiveResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn bolt11_decode(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: Bolt11DecodeRequest,
) -> Result<Bolt11DecodeResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/bolt11/decode").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<Bolt11DecodeResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn bolt11_send(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: Bolt11SendRequest,
) -> Result<SendResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/bolt11/send").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<SendResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn bolt11_send_using_amount(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: Bolt11SendUsingAmountRequest,
) -> Result<SendResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base
		.join("api/v1/bolt11/send_using_amount")
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<SendResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn bolt11_pay(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: Bolt11PayRequest,
) -> Result<Bolt11PayResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/bolt11/pay").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<Bolt11PayResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn bolt12_offer_receive(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: Bolt12OfferReceiveRequest,
) -> Result<Bolt12OfferResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/bolt12/offer/receive").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<Bolt12OfferResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn bolt12_offer_receive_var(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: Bolt12OfferReceiveVarRequest,
) -> Result<Bolt12OfferResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/bolt12/offer/receive_var").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<Bolt12OfferResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn bolt12_offer_decode(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: Bolt12OfferDecodeRequest,
) -> Result<Bolt12OfferDecodeResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/bolt12/offer/decode").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<Bolt12OfferDecodeResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn bolt12_offer_send(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: Bolt12OfferSendRequest,
) -> Result<SendResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/bolt12/offer/send").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<SendResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn bolt12_refund_initiate(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: Bolt12RefundInitiateRequest,
) -> Result<Bolt12RefundInitiateResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/bolt12/refund/initiate").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<Bolt12RefundInitiateResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn bolt12_refund_decode(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: Bolt12RefundDecodeRequest,
) -> Result<Bolt12RefundDecodeResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/bolt12/refund/decode").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<Bolt12RefundDecodeResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn bolt12_refund_request_payment(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: Bolt12RefundRequestPaymentRequest,
) -> Result<Bolt12RefundRequestPaymentResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base
		.join("api/v1/bolt12/refund/request_payment")
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<Bolt12RefundRequestPaymentResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn channel_close(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: CloseChannelRequest,
) -> Result<OkResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/channel/close").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<OkResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn channel_force_close(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: CloseChannelRequest,
) -> Result<OkResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/channel/force_close").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<OkResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn payments_list(
	client: &reqwest::Client,
	ctx: &NodeContext,
) -> Result<Vec<PaymentDetailsDto>, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/payments").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.get(url);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<Vec<PaymentDetailsDto>>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn payment_get(
	client: &reqwest::Client,
	ctx: &NodeContext,
	payment_id: &str,
) -> Result<PaymentDetailsDto, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base
		.join(&format!("api/v1/payment/{payment_id}"))
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		})?;

	let mut req = client.get(url);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<PaymentDetailsDto>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn payment_wait(
	client: &reqwest::Client,
	ctx: &NodeContext,
	payment_id: &str,
	req_body: PaymentWaitRequest,
) -> Result<PaymentWaitResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base
		.join(&format!("api/v1/payment/{payment_id}/wait"))
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<PaymentWaitResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn payment_abandon(
	client: &reqwest::Client,
	ctx: &NodeContext,
	payment_id: &str,
) -> Result<OkResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base
		.join(&format!("api/v1/payment/{payment_id}/abandon"))
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		})?;

	let mut req = client.post(url);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<OkResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn events_wait_next(
	client: &reqwest::Client,
	ctx: &NodeContext,
) -> Result<EventDto, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base
		.join("api/v1/events/wait_next")
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		})?;

	let mut req = client.post(url).json(&serde_json::json!({}));
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<EventDto>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn events_handled(client: &reqwest::Client, ctx: &NodeContext) -> Result<(), CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base
		.join("api/v1/events/handled")
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		})?;

	let mut req = client.post(url).json(&serde_json::json!({}));
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}
	Ok(())
}

pub async fn main_healthz(
	client: &reqwest::Client,
	ctx: &NodeContext,
) -> Result<OkResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/healthz").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.get(url);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<OkResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn main_readyz(
	client: &reqwest::Client,
	ctx: &NodeContext,
) -> Result<OkResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/readyz").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.get(url);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	let status = resp.status().as_u16();
	match status {
		200 | 503 => resp
			.json::<OkResponse>()
			.await
			.map_err(|_| CommandError::HttpRequestFailed),
		_ => Err(classify_non_success("main", resp).await?),
	}
}

fn control_base(ctx: &NodeContext) -> Result<Url, CommandError> {
	let Some(base) = ctx.control_api_base_url.as_deref() else {
		return Err(CommandError::ControlApiNotConfigured);
	};
	parse_base_url(base)
}

fn control_bearer(ctx: &NodeContext) -> Result<String, CommandError> {
	let Some(path) = ctx.control_api_token_file_path.as_deref() else {
		return Err(CommandError::TokenFileNotConfigured);
	};
	read_token_file(Path::new(path))
}

pub async fn control_status(
	client: &reqwest::Client,
	ctx: &NodeContext,
) -> Result<ControlStatusDto, CommandError> {
	let base = control_base(ctx)?;
	let url = base
		.join("control/status")
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx
				.control_api_base_url
				.clone()
				.unwrap_or_else(|| "<missing>".to_string()),
		})?;

	let token = control_bearer(ctx)?;
	let resp = client
		.get(url)
		.bearer_auth(token)
		.send()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)?;

	if !resp.status().is_success() {
		return Err(classify_non_success("control", resp).await?);
	}

	resp.json::<ControlStatusDto>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn control_unlock(
	client: &reqwest::Client,
	ctx: &NodeContext,
) -> Result<ControlStatusDto, CommandError> {
	let base = control_base(ctx)?;
	let url = base
		.join("control/unlock")
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx
				.control_api_base_url
				.clone()
				.unwrap_or_else(|| "<missing>".to_string()),
	})?;
	let token = control_bearer(ctx)?;

	let resp = client
		.post(url)
		.bearer_auth(token)
		.json(&serde_json::json!({}))
		.send()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)?;

	if !resp.status().is_success() {
		return Err(classify_non_success("control", resp).await?);
	}

	resp.json::<ControlStatusDto>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn control_lock(
	client: &reqwest::Client,
	ctx: &NodeContext,
) -> Result<ControlStatusDto, CommandError> {
	let base = control_base(ctx)?;
	let url = base
		.join("control/lock")
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx
				.control_api_base_url
				.clone()
				.unwrap_or_else(|| "<missing>".to_string()),
	})?;
	let token = control_bearer(ctx)?;

	let resp = client
		.post(url)
		.bearer_auth(token)
		.json(&serde_json::json!({ "yes": true }))
		.send()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)?;

	if !resp.status().is_success() {
		return Err(classify_non_success("control", resp).await?);
	}

	resp.json::<ControlStatusDto>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn rgb_utxos_summary(
    client: &reqwest::Client,
    ctx: &NodeContext,
) -> Result<RgbUtxosSummaryResponse, CommandError> {
    let base = parse_base_url(&ctx.main_api_base_url)?;
    let url = base
        .join("api/v1/rgb/utxos/summary")
        .map_err(|_| CommandError::InvalidBaseUrl {
            url: ctx.main_api_base_url.clone(),
        })?;

    let mut req = client.get(url);
    if let Some(path) = ctx.main_api_token_file_path.as_deref() {
        let token = read_token_file(Path::new(path))?;
        req = req.bearer_auth(token);
    }

    let resp = req
        .send()
        .await
        .map_err(|_| CommandError::HttpRequestFailed)?;
    if !resp.status().is_success() {
        return Err(classify_non_success("main", resp).await?);
    }

    resp.json::<RgbUtxosSummaryResponse>()
        .await
        .map_err(|_| CommandError::HttpRequestFailed)
}


pub async fn rgb_onchain_invoice_create(
    client: &reqwest::Client,
    ctx: &NodeContext,
    req_body: RgbOnchainInvoiceCreateRequest,
) -> Result<RgbOnchainInvoiceResponse, CommandError> {
    let base = parse_base_url(&ctx.main_api_base_url)?;
    let url = base
        .join("api/v1/rgb/onchain/invoice/create")
        .map_err(|_| CommandError::InvalidBaseUrl {
            url: ctx.main_api_base_url.clone(),
        })?;

    let mut req = client.post(url).json(&req_body);
    if let Some(path) = ctx.main_api_token_file_path.as_deref() {
        let token = read_token_file(Path::new(path))?;
        req = req.bearer_auth(token);
    }

    let resp = req
        .send()
        .await
        .map_err(|_| CommandError::HttpRequestFailed)?;
    if !resp.status().is_success() {
        return Err(classify_non_success("main", resp).await?);
    }

    resp.json::<RgbOnchainInvoiceResponse>()
        .await
        .map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn rgb_onchain_invoice_decode(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: RgbOnchainInvoiceDecodeRequest,
) -> Result<RgbOnchainInvoiceDecodeResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base
		.join("api/v1/rgb/onchain/invoice/decode")
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req
		.send()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<RgbOnchainInvoiceDecodeResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn rgb_new_address(
    client: &reqwest::Client,
    ctx: &NodeContext,
) -> Result<WalletNewAddressResponse, CommandError> {
    let base = parse_base_url(&ctx.main_api_base_url)?;
    let url = base
        .join("api/v1/rgb/new_address")
        .map_err(|_| CommandError::InvalidBaseUrl {
            url: ctx.main_api_base_url.clone(),
        })?;

    let mut req = client.post(url).json(&serde_json::json!({}));
    if let Some(path) = ctx.main_api_token_file_path.as_deref() {
        let token = read_token_file(Path::new(path))?;
        req = req.bearer_auth(token);
    }

    let resp = req
        .send()
        .await
        .map_err(|_| CommandError::HttpRequestFailed)?;
    if !resp.status().is_success() {
        return Err(classify_non_success("main", resp).await?);
    }

    resp.json::<WalletNewAddressResponse>()
        .await
        .map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn rgb_onchain_receive_archive(
    client: &reqwest::Client,
    ctx: &NodeContext,
    format: &str,
		payment_id: &str,
    archive: &[u8],
) -> Result<RgbOnchainReceiveResponse, CommandError> {
    let base = parse_base_url(&ctx.main_api_base_url)?;
    let url = base
        .join(&format!("api/v1/rgb/onchain/receive?format={format}&payment_id={payment_id}"))
        .map_err(|_| CommandError::InvalidBaseUrl {
            url: ctx.main_api_base_url.clone(),
        })?;

    let mut req = client
        .post(url)
        .header("Content-Type", "application/octet-stream")
        .body(archive.to_vec());
    if let Some(path) = ctx.main_api_token_file_path.as_deref() {
        let token = read_token_file(Path::new(path))?;
        req = req.bearer_auth(token);
    }

    let resp = req
        .send()
        .await
        .map_err(|_| CommandError::HttpRequestFailed)?;
    if !resp.status().is_success() {
        return Err(classify_non_success("main", resp).await?);
    }

    resp.json::<RgbOnchainReceiveResponse>()
        .await
        .map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn rgb_issuers_import(
    client: &reqwest::Client,
    ctx: &NodeContext,
    name: &str,
    format: &str,
    archive: &[u8],
) -> Result<RgbIssuersImportResponse, CommandError> {
    let base = parse_base_url(&ctx.main_api_base_url)?;
    let url = base
        .join(&format!(
            "api/v1/rgb/issuers/import?name={name}&format={format}"
        ))
        .map_err(|_| CommandError::InvalidBaseUrl {
            url: ctx.main_api_base_url.clone(),
        })?;

    let mut req = client
        .post(url)
        .header("Content-Type", "application/octet-stream")
        .body(archive.to_vec());
    if let Some(path) = ctx.main_api_token_file_path.as_deref() {
        let token = read_token_file(Path::new(path))?;
        req = req.bearer_auth(token);
    }

    let resp = req
        .send()
        .await
        .map_err(|_| CommandError::HttpRequestFailed)?;
    if !resp.status().is_success() {
        return Err(classify_non_success("main", resp).await?);
    }

    resp.json::<RgbIssuersImportResponse>()
        .await
        .map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn rgb_issuers(
    client: &reqwest::Client,
    ctx: &NodeContext,
) -> Result<RgbIssuersResponse, CommandError> {
    let base = parse_base_url(&ctx.main_api_base_url)?;
    let url = base
        .join("api/v1/rgb/issuers")
        .map_err(|_| CommandError::InvalidBaseUrl {
            url: ctx.main_api_base_url.clone(),
        })?;

    let mut req = client.get(url);
    if let Some(path) = ctx.main_api_token_file_path.as_deref() {
        let token = read_token_file(Path::new(path))?;
        req = req.bearer_auth(token);
    }

    let resp = req
        .send()
        .await
        .map_err(|_| CommandError::HttpRequestFailed)?;
    if !resp.status().is_success() {
        return Err(classify_non_success("main", resp).await?);
    }

    resp.json::<RgbIssuersResponse>()
        .await
        .map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn rgb_onchain_send(
	client: &reqwest::Client,
	ctx: &NodeContext,
	req_body: RgbOnchainSendRequest,
) -> Result<RgbOnchainSendResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/rgb/onchain/send").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.post(url).json(&req_body);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<RgbOnchainSendResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}

pub async fn rgb_onchain_payments(
	client: &reqwest::Client,
	ctx: &NodeContext,
) -> Result<RgbOnchainPaymentsResponse, CommandError> {
	let base = parse_base_url(&ctx.main_api_base_url)?;
	let url = base.join("api/v1/rgb/onchain/payments").map_err(|_| {
		CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		}
	})?;

	let mut req = client.get(url);
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(classify_non_success("main", resp).await?);
	}

	resp.json::<RgbOnchainPaymentsResponse>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}
