use serde::Deserialize;
use tauri::{AppHandle, Manager};
use std::path::PathBuf;
use tauri::path::PathResolver;

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub core_domain_whitelist: Vec<String>,
}


pub fn load_app_config(handle: &AppHandle) -> Result<AppConfig, String> {
    let resource_path: PathBuf = handle.path()
        .resolve("resources/app_config.json", tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("resolve config path err:{}", e))?;

    let content = std::fs::read_to_string(&resource_path)
        .map_err(|e| format!("read config file err:{}", e))?;

    let cfg: AppConfig = serde_json::from_str(&content)
        .map_err(|e| format!("parse json err:{}", e))?;
    Ok(cfg)
}
