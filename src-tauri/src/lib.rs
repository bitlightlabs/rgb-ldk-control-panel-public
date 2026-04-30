mod commands;
mod app_dirs;
mod context_store;
mod error;
mod events_manager;
mod logger;
mod rgbldkd_http;
mod wallet;
mod util;

use context_store::ContextStore;
use events_manager::EventsManager;
use logger::FileLogger;
use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::{
    AppHandle, Manager,
    tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState},
    menu::{Menu, MenuItem, PredefinedMenuItem},
};

pub struct AppState {
	pub(crate) store: ContextStore,
	pub(crate) http: reqwest::Client,
	pub(crate) events: EventsManager,
	pub(crate) logger: FileLogger,
	pub(crate) http_event_debug_responses: Arc<RwLock<bool>>,
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
			http_event_debug_responses: Arc::new(RwLock::new(false)),
		}
	}
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	let mut builder = tauri::Builder::default()
		.setup(|app| {
				create_tray(app)?;
				Ok(())
		})
		.on_window_event(|window, event| {
				if let tauri::WindowEvent::CloseRequested { api, .. } = event {
						// Intercept close requests
						api.prevent_close();
						window.hide().unwrap();
				}
		})
		.manage(AppState::new())
		.plugin(tauri_plugin_opener::init())
		.plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_clipboard_manager::init());

	#[cfg(debug_assertions)]
	let builder = builder.plugin(tauri_plugin_webdriver::init());

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
			commands::events_http_debug_get,
			commands::events_http_debug_set,
			commands::logs_path,
			commands::logs_tail,
			commands::log_ui,
			commands::docker_environment,
			commands::bootstrap_local_node,
			commands::bootstrap_local_environment,
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
			commands::download_transfer_consignment_from_link,
			commands::rgb_onchain_payments,
			commands::node_rgb_descriptor,
			commands::node_rgb_sign_message,
			commands::download_transfer_consignment_from_link_no_verify,
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}

fn create_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItem::with_id(app, "show", "Dashboard", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &sep, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("RGB LDK Control Panel")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => show_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

fn show_window(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        // let _ = w.set_focus();
    }
}
