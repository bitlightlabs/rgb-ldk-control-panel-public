mod commands;
mod app_dirs;
mod cli_spawn;
mod context_store;
mod error;
mod events_manager;
mod logger;
mod rgbldkd_http;
mod wallet;
mod util;
mod mem_cache;
mod constant;
mod ensure_image;
mod ldk_types;

use context_store::ContextStore;
use events_manager::EventsManager;
use logger::FileLogger;
use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::{
    AppHandle, Manager, menu::{Menu, MenuItem, PredefinedMenuItem}, tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent}
};

pub struct AppState {
	pub(crate) store: ContextStore,
	pub(crate) http: reqwest::Client,
	pub(crate) events: EventsManager,
	pub(crate) logger: FileLogger,
	pub(crate) http_event_debug_responses: Arc<RwLock<bool>>,
	// pub(crate) mem_cache: mem_cache::Cache,
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
			// mem_cache: mem_cache::Cache::new(),
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
		// Frontend intercept close requests to hide the window.
		// .on_window_event(|window, event| {
		// 		if let tauri::WindowEvent::CloseRequested { api, .. } = event {
		// 				// Intercept close requests
		// 				api.prevent_close();
		// 				window.hide().unwrap();
		// 		}
		// })
		.manage(AppState::new())
		.manage(mem_cache::Cache::new())
		.plugin(tauri_plugin_opener::init())
		.plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_clipboard_manager::init())
		.plugin(tauri_plugin_store::Builder::default().build());

	#[cfg(debug_assertions)]
	let builder = builder.plugin(tauri_plugin_webdriver::init());

	let app = builder.invoke_handler(tauri::generate_handler![
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
			commands::re_start_local_node,
			commands::prepare_node_resources,
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
			commands::node_wallet_address_new,
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
			commands::node_rgb_address_new,
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
			mem_cache::mem_cache_get,
			mem_cache::mem_cache_set,
			mem_cache::mem_cache_remove,
			commands::node_rgb_ln_invoice_decode,
			// commands::node_rgb_cli_wallet_new_mnemonic,
			// commands::node_rgb_cli_wallet_init,
			// commands::node_rgb_cli_wallet_backup_export,
			// commands::node_rgb_cli_wallet_backup_import,
			commands::node_run_cli,
			commands::wallet_new_mnemonic_cli,
			commands::wallet_init_cli,
			commands::wallet_show_mnemonic_cli,
			commands::backup_export_cli,
			commands::backup_import_cli,
			commands::backup_inspect_archive_cli,
			commands::hash_password,
			commands::verify_password,
			ensure_image::ensure_docker_image,
			commands::node_rgb_utxos,
			commands::node_rgb_utxo_release,
			wallet::wallet_recommended_fees,
			commands::node_wallet_l1_utxos,
			commands::node_rgb_utxo_sweep,
			commands::node_rgb_utxo_top_up,
			commands::node_rgb_utxos_fund,
			commands::node_wallet_address_current,
			commands::node_rgb_address_current,
			commands::stop_local_node,
			commands::node_rgb_ln_estimate_carrier,
			commands::contexts_update_image,
			commands::node_swap_offers,
			commands::node_swap_execute,
			commands::node_swap_accept,
			commands::node_swap_decode,
			commands::node_swap_list,
			commands::node_swap_info,
			commands::node_swap_delete,
			commands::node_main_channels_closing,
		])
		.build(tauri::generate_context!())
		.expect("error while running tauri application");

	// Reopen
	app.run(|app_handle, event| {
			match event {
					#[cfg(target_os = "macos")]
					tauri::RunEvent::Reopen {
							has_visible_windows,
							..
					} => {
							if !has_visible_windows {
									show_window(app_handle);
							}
					}
					_ => {}
			}
	});
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
        let _ = w.set_focus();
    }
}
