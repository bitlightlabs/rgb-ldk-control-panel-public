mod commands;
mod app_dirs;
mod context_store;
mod error;
mod events_manager;
mod logger;
mod rgbldkd_http;
mod wallet;

use context_store::ContextStore;
use events_manager::EventsManager;
use logger::FileLogger;

pub struct AppState {
	pub(crate) store: ContextStore,
	pub(crate) http: reqwest::Client,
	pub(crate) events: EventsManager,
	pub(crate) logger: FileLogger,
}

impl AppState {
	fn new() -> Self {
		let http = reqwest::Client::builder()
			// Local node APIs are always on localhost/loopback; avoid system proxy interference.
			.no_proxy()
			.build()
			.expect("failed to init reqwest client");
		Self {
			store: ContextStore::new().expect("failed to init context store"),
			http,
			events: EventsManager::new(),
			logger: FileLogger::new_default().expect("failed to init file logger"),
		}
	}
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	let mut builder = tauri::Builder::default()
		.manage(AppState::new())
		.plugin(tauri_plugin_opener::init())
		.plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init());

	#[cfg(debug_assertions)]
	{
		builder = builder.plugin(tauri_plugin_webdriver::init());
	}

	builder.invoke_handler(tauri::generate_handler![
			commands::contexts_list,
			commands::contexts_reload,
			commands::contexts_path,
			commands::contexts_upsert,
			commands::contexts_remove,
			commands::events_start_all,
			commands::events_start,
			commands::events_stop,
			commands::events_list,
			commands::events_clear,
			commands::events_status,
			commands::events_status_all,
			commands::logs_path,
			commands::logs_tail,
			commands::log_ui,
			commands::docker_environment,
			commands::bootstrap_local_node,
			commands::bootstrap_local_environment,
			commands::regtest_block_height,
			commands::regtest_mine,
			commands::node_main_http,
			commands::node_main_status,
			commands::node_main_version,
			commands::node_main_node_id,
			commands::node_main_listening_addresses,
			commands::node_main_peers,
			commands::node_main_peers_connect,
			commands::node_main_peers_disconnect,
			commands::node_main_balances,
			commands::node_wallet_new_address,
			commands::node_wallet_sync,
			commands::node_rgb_sync,
			commands::node_rgb_contracts,
			commands::node_rgb_contract_issue,
			commands::node_rgb_contract_export_bundle,
			commands::node_rgb_contract_import_bundle,
			commands::node_rgb_contract_balance,
			commands::node_rgb_ln_invoice_create,
			commands::node_rgb_ln_pay,
			commands::node_main_channels,
			commands::node_channel_open,
			commands::node_bolt11_receive,
			commands::node_bolt11_receive_var,
			commands::node_bolt11_decode,
			commands::node_bolt11_send,
			commands::node_bolt11_send_using_amount,
			commands::node_bolt11_pay,
			commands::node_bolt12_offer_receive,
			commands::node_bolt12_offer_receive_var,
			commands::node_bolt12_offer_decode,
			commands::node_bolt12_offer_send,
			commands::node_bolt12_refund_initiate,
			commands::node_bolt12_refund_decode,
			commands::node_bolt12_refund_request_payment,
			commands::node_payments_list,
			commands::node_payment_get,
			commands::node_payment_wait,
			commands::node_payment_abandon,
			commands::node_channel_close,
			commands::node_channel_force_close,
			commands::node_main_healthz,
			commands::node_main_readyz,
			commands::node_control_status,
			commands::node_unlock,
			commands::node_lock,
			commands::plugin_wallet_asset_export,
			commands::node_rgb_utxos_summary,
			commands::node_rgb_onchain_invoice_create,
			commands::node_rgb_new_address,
			commands::plugin_wallet_transfer_consignment_export,
			commands::node_rgb_onchain_transfer_consignment_accept,
			commands::node_rgb_contract_issuers_import,
			commands::node_rgb_issuers,
			commands::node_rgb_onchain_transfer_consignment_download,
			commands::node_rgb_onchain_send,
			commands::plugin_wallet_transfer_consignment_accept,
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
