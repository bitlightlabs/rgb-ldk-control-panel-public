// src-tauri/src/ensure_image.rs

use std::process::Command;

/// Check if Docker is available
pub fn is_docker_available() -> bool {
    let docker_path = crate::cli_spawn::resolve_docker();

    Command::new(docker_path)
        .arg("info")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Returns true if the image exists locally, false otherwise.
pub fn image_exists(image: &str) -> bool {
    let docker_path = crate::cli_spawn::resolve_docker();

    Command::new(docker_path)
        .args(["image", "inspect", image])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Returns Ok(()) if the image was pulled successfully, or an Err with a message if it failed.
pub fn pull_image(image: &str) -> Result<(), String> {
    let docker_path = crate::cli_spawn::resolve_docker();

    let status = Command::new(docker_path)
        .args(["pull", image])
        .status()
        .map_err(|e| format!("Failed to pull image: {}", image))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("Failed to pull image: {}, Check your network", image))
    }
}

#[tauri::command]
pub async fn ensure_docker_image(image: String) -> Result<bool, String> {
    // 1. Check if Docker is available
    if !is_docker_available() {
        return Err("Docker not available".into());
    }

    // 2. Check if the image already exists
    if image_exists(&image) {
        return Ok(true);
    }

    // 3. Pull the image if it doesn't exist
    pull_image(&image)?;

    Ok(true)
}
