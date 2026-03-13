use crate::error::CommandError;
use directories::ProjectDirs;
use std::path::PathBuf;

fn project_dirs() -> Result<ProjectDirs, CommandError> {
	ProjectDirs::from("com", "bitlight", "rln").ok_or(CommandError::Io)
}

pub fn config_dir() -> Result<PathBuf, CommandError> {
	if let Ok(val) = std::env::var("RGB_LDK_CONTROL_PANEL_CONFIG_DIR") {
		let trimmed = val.trim();
		if !trimmed.is_empty() {
			return Ok(PathBuf::from(trimmed));
		}
	}
	Ok(project_dirs()?.config_dir().to_path_buf())
}

pub fn data_dir() -> Result<PathBuf, CommandError> {
	if let Ok(val) = std::env::var("RGB_LDK_CONTROL_PANEL_DATA_DIR") {
		let trimmed = val.trim();
		if !trimmed.is_empty() {
			return Ok(PathBuf::from(trimmed));
		}
	}
	Ok(project_dirs()?.data_local_dir().to_path_buf())
}
