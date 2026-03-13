use crate::error::CommandError;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tokio::sync::Mutex;
use crate::app_dirs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeContext {
	pub node_id: String,
	pub display_name: String,
	pub main_api_base_url: String,
	pub main_api_token_file_path: Option<String>,
	pub control_api_base_url: Option<String>,
	pub control_api_token_file_path: Option<String>,
	pub data_dir: Option<String>,
	pub p2p_listen: Option<String>,
	pub rgb_consignment_base_url: Option<String>,
	#[serde(default)]
	pub allow_non_loopback: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoreFileV1 {
	version: u32,
	contexts: Vec<NodeContext>,
}

pub struct ContextStore {
	path: PathBuf,
	data: Mutex<StoreFileV1>,
}

impl ContextStore {
	pub fn new() -> Result<Self, CommandError> {
		let dir = app_dirs::config_dir()?;
		let path = dir.join("contexts.json");

		let data = match read_json(&path) {
			Ok(v) => v,
			Err(_) => StoreFileV1 {
				version: 1,
				contexts: vec![],
			},
		};

	Ok(Self {
		path,
		data: Mutex::new(data),
	})
	}

	pub fn path(&self) -> &Path {
		&self.path
	}

	pub async fn list(&self) -> Vec<NodeContext> {
		let st = self.data.lock().await;
		st.contexts.clone()
	}

	pub async fn reload(&self) -> Result<(), CommandError> {
		let data = read_json(&self.path)?;
		let mut st = self.data.lock().await;
		*st = data;
		Ok(())
	}

	pub async fn get(&self, node_id: &str) -> Option<NodeContext> {
		let st = self.data.lock().await;
		st.contexts.iter().find(|c| c.node_id == node_id).cloned()
	}

	pub async fn upsert(&self, context: NodeContext) -> Result<(), CommandError> {
		let mut st = self.data.lock().await;
		if let Some(existing) = st.contexts.iter_mut().find(|c| c.node_id == context.node_id) {
			*existing = context;
		} else {
			st.contexts.push(context);
		}
		write_json(&self.path, &*st)?;
		Ok(())
	}

	pub async fn remove(&self, node_id: &str) -> Result<(), CommandError> {
		let mut st = self.data.lock().await;
		let before = st.contexts.len();
		st.contexts.retain(|c| c.node_id != node_id);
		if st.contexts.len() == before {
			return Err(CommandError::ContextNotFound {
				node_id: node_id.to_string(),
			});
		}
		write_json(&self.path, &*st)?;
		Ok(())
	}
}

fn read_json(path: &Path) -> Result<StoreFileV1, CommandError> {
	let s = std::fs::read_to_string(path).map_err(|_| CommandError::Io)?;
	serde_json::from_str(&s).map_err(|_| CommandError::Io)
}

fn write_json(path: &Path, data: &StoreFileV1) -> Result<(), CommandError> {
	if let Some(parent) = path.parent() {
		std::fs::create_dir_all(parent).map_err(|_| CommandError::Io)?;
	}
	let tmp = path.with_extension("json.tmp");
	let s = serde_json::to_string_pretty(data).map_err(|_| CommandError::Io)?;
	std::fs::write(&tmp, s).map_err(|_| CommandError::Io)?;
	std::fs::rename(&tmp, path).map_err(|_| CommandError::Io)?;
	Ok(())
}
