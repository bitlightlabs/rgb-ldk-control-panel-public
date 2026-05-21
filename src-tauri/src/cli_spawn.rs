//! Spawn one-shot rgbldkd subcommands via `docker run --rm`.
//!
//! Contract with rgb-ldk-node (milestone1):
//!   - We always pass `--output-format=json` immediately after the binary.
//!   - Success path: rgbldkd writes JSON to stdout, exit code 0.
//!   - Failure path: rgbldkd writes `{"ok":false,"error":{"code,kind,message}}`
//!     to stderr and exits with a stable code (10/11/12/13/14/15/16/20/21).
//!
//! This module hides the docker-run plumbing and maps failures to
//! `CommandError::SubcommandFailed` so the frontend can branch UI copy by
//! `exit_code` / `kind` without parsing the human message.

use crate::error::CommandError;
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::process::Command;

/// A bind mount or named volume to attach to the throwaway container.
#[derive(Debug, Clone)]
pub enum Mount {
	/// `--mount type=bind,src=<host>,dst=<container>,readonly=<ro>`
	Bind { host: PathBuf, container: String, readonly: bool },
	/// `-v <volume>:<container>`
	Volume { volume: String, container: String },
}

/// Inputs to one CLI invocation.
pub struct CliSpawn<'a> {
	/// Docker image to run (e.g. `bitlightlabs/rln-ldk-node:adhoc-timer`).
	pub image: &'a str,
	/// Human label of the subcommand, used in error messages (e.g. `"wallet new-mnemonic"`).
	pub subcommand_label: &'a str,
	/// Arguments after `rgbldkd --output-format=json` (e.g. `["wallet","new-mnemonic"]`).
	pub args: Vec<String>,
	/// Volumes and bind mounts.
	pub mounts: Vec<Mount>,
}

/// Run `docker run --rm <image> rgbldkd --output-format=json <args...>` and return the parsed
/// stdout JSON on success.
///
/// On non-zero exit:
///   - Parses stderr JSON `{ok:false,error:{code,kind,message}}` if present.
///   - Falls back to raw stderr text when JSON parsing fails (e.g. container failed to start).
///
/// docker run can block for tens of seconds (image pull, container startup),
/// so we run the synchronous `Command::output()` on a blocking pool worker
/// rather than the Tauri current_thread runtime. The .await yields back to
/// the runtime, letting other IPC commands and the events polling task make
/// progress in the meantime.
pub async fn spawn(req: CliSpawn<'_>) -> Result<Value, CommandError> {
	let CliSpawn { image, subcommand_label, args, mounts } = req;
	let subcommand_label = subcommand_label.to_string();

	let mut docker_args: Vec<String> = vec![
		"run".to_string(),
		"--rm".to_string(),
		// Never attempt a registry pull — use the locally cached image only.
		// This eliminates the manifest-check round-trip that can add several
		// seconds even when the image is already present on disk.
		// (Requires Docker 20.10+, which is universal by 2024.)
		"--pull=never".to_string(),
	];

	for m in &mounts {
		match m {
			Mount::Bind { host, container, readonly } => {
				let ro = if *readonly { ",readonly" } else { "" };
				docker_args.push("--mount".to_string());
				docker_args.push(format!(
					"type=bind,src={},dst={}{ro}",
					host.display(),
					container
				));
			},
			Mount::Volume { volume, container } => {
				docker_args.push("-v".to_string());
				docker_args.push(format!("{volume}:{container}"));
			},
		}
	}

	docker_args.push(image.to_string());
	docker_args.push("rgbldkd".to_string());
	docker_args.push("--output-format=json".to_string());
	docker_args.extend(args);

	let docker_path = resolve_docker();
	let output = tokio::task::spawn_blocking(move || {
		Command::new(docker_path).args(&docker_args).output()
	})
	.await
	.map_err(|e| CommandError::SubcommandFailed {
		subcommand: subcommand_label.clone(),
		exit_code: -1,
		kind: Some("blocking_join_failed".to_string()),
		message: Some(format!("docker worker join failed: {e}")),
		hint: None,
	})?
	.map_err(|e| CommandError::SubcommandFailed {
		subcommand: subcommand_label.clone(),
		exit_code: -1,
		kind: Some("docker_spawn_failed".to_string()),
		message: Some(format!("failed to spawn docker: {e}")),
		hint: Some("Check that docker is installed and the daemon is running.".to_string()),
	})?;

	let exit_code = output.status.code().unwrap_or(-1);

	if output.status.success() {
		let stdout = String::from_utf8_lossy(&output.stdout);
		let trimmed = stdout.trim();
		if trimmed.is_empty() {
			return Ok(Value::Null);
		}
		return serde_json::from_str::<Value>(trimmed).map_err(|e| {
			CommandError::SubcommandFailed {
				subcommand: subcommand_label.to_string(),
				exit_code,
				kind: Some("invalid_stdout_json".to_string()),
				message: Some(format!("rgbldkd stdout was not valid JSON: {e}")),
				hint: None,
			}
		});
	}

	// Non-zero: try to parse the structured error envelope.
	let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
	let (kind, message) = parse_error_envelope(&stderr)
		.unwrap_or_else(|| (None, if stderr.is_empty() { None } else { Some(stderr.clone()) }));

	Err(CommandError::SubcommandFailed {
		subcommand: subcommand_label.to_string(),
		exit_code,
		kind,
		message,
		hint: hint_for_exit_code(exit_code),
	})
}

/// Parse the trailing `{"ok":false,"error":{...}}` line from rgbldkd stderr.
///
/// rgbldkd may emit log lines before the JSON envelope, so we scan from the end
/// for the first line that parses as JSON with the expected shape.
fn parse_error_envelope(stderr: &str) -> Option<(Option<String>, Option<String>)> {
	for line in stderr.lines().rev() {
		let line = line.trim();
		if !line.starts_with('{') {
			continue;
		}
		let Ok(v) = serde_json::from_str::<Value>(line) else { continue };
		let err = v.get("error")?;
		if let Some(obj) = err.as_object() {
			let kind = obj.get("kind").and_then(|v| v.as_str()).map(|s| s.to_string());
			let message = obj.get("message").and_then(|v| v.as_str()).map(|s| s.to_string());
			return Some((kind, message));
		}
		// Some legacy errors are `{"ok":false,"error":"<string>"}` — daemon path, but treat it as message-only.
		if let Some(s) = err.as_str() {
			return Some((None, Some(s.to_string())));
		}
	}
	None
}

fn hint_for_exit_code(code: i32) -> Option<String> {
	let s = match code {
		// clap exits with code 2 on argument-parse failure, before rgbldkd's
		// own error handling runs (so the stderr envelope is NOT a JSON
		// `{ok:false,...}` payload — it's clap's plain text usage error).
		2 => "rgbldkd rejected the CLI arguments (clap parse error). This is a control-panel bug — the argv passed by cli_spawn is invalid for the rgbldkd version in the image.",
		10 => "Destination directory is not empty. Choose an empty data-dir or move existing files.",
		11 => "Mnemonic fingerprint does not match this backup. Restore with the matching mnemonic.",
		12 => "Backup archive is corrupted (tar, hash, or manifest). Try a different archive.",
		13 => "Backup network does not match the target node network.",
		14 => "Backup archive format version is unsupported. Update rgbldkd.",
		15 => "This command requires --confirm. The UI must confirm before retrying.",
		16 => "Node container is still running. Stop it (or lock) before retrying.",
		20 => "rgbldkd hit a system error (IO/permissions). Check container logs.",
		21 => "Bad arguments passed to rgbldkd. This is a control-panel bug.",
		// docker itself exits 125 on a daemon/run error (e.g. image-not-found,
		// invalid mount), before the entrypoint runs. Surface a hint so the
		// frontend can distinguish "rgbldkd said no" from "docker said no".
		125 => "Docker rejected the run command (image not found, invalid mount, or daemon error). Check the image tag and that the target paths are inside Docker Desktop's File Sharing settings.",
		_ => return None,
	};
	Some(s.to_string())
}

pub fn resolve_docker() -> PathBuf {
	// On macOS, when launched from Finder, $PATH may not include /usr/local/bin.
	// Prefer absolute paths to common docker install locations.
	for candidate in ["/usr/local/bin/docker", "/opt/homebrew/bin/docker", "/usr/bin/docker"] {
		let p = Path::new(candidate);
		if p.exists() {
			return p.to_path_buf();
		}
	}
	PathBuf::from("docker")
}
