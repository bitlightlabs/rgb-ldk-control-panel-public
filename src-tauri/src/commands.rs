use crate::{
	app_dirs,
	context_store::{ContextStore, NodeContext},
	error::CommandError,
	events_manager::{EventsStatus, StoredEvent},
	logger::{now_ms, LogEntry, LogLevel},
	rgbldkd_http,
	rgbldkd_http::{ControlStatusDto, MainStatusResponse, OkResponse},
	AppState,
	wallet,
};
use base64::{engine::general_purpose, Engine as _};
use serde::Serialize;
use tauri::AppHandle;
use tauri::State;
use std::collections::{HashMap, HashSet};
use std::future::Future;
use std::process::Command;
use std::time::Duration;
use std::path::{Path, PathBuf};
use sha2::{Sha256, Digest};
use hex;

const DEFAULT_BOOTSTRAP_ISSUER_NAME: &str = "RGB20-Simplest-v0-rLosfg";
const DEFAULT_BOOTSTRAP_CONTRACT_NAME: &str = "RGB";
const DEFAULT_BOOTSTRAP_TICKER: &str = "RGB";
const DEFAULT_BOOTSTRAP_ISSUED_SUPPLY: &str = "1000000";
const MAX_EVENT_RESPONSE_CHARS: usize = 2048;
const DEFAULT_BOOTSTRAP_ISSUER_RAW: &[u8] =
	include_bytes!("../../e2e-tests/fixtures/RGB20-Simplest-v0-rLosfg.issuer");
const BUILTIN_DOCKER_COMPOSE_YML: &str = include_str!("../../docker-compose.yml");

fn compact_response_value(v: serde_json::Value) -> serde_json::Value {
	let serialized = match serde_json::to_string(&v) {
		Ok(s) => s,
		Err(_) => {
			return serde_json::json!({
				"truncated": true,
				"reason": "serialize_failed",
			});
		}
	};
	if serialized.len() <= MAX_EVENT_RESPONSE_CHARS {
		return v;
	}
	let preview = serialized.chars().take(MAX_EVENT_RESPONSE_CHARS).collect::<String>();
	serde_json::json!({
		"truncated": true,
		"size_chars": serialized.len(),
		"preview": preview,
	})
}

fn normalize_base_url(field: &str, raw: &str) -> Result<String, CommandError> {
	let trimmed = raw.trim();
	if trimmed.is_empty() {
		return Err(CommandError::InvalidContext {
			field: field.to_string(),
			message: "missing url".to_string(),
			hint: Some("Expected e.g. http://127.0.0.1:8500/".to_string()),
		});
	}

	let mut url = reqwest::Url::parse(trimmed).map_err(|_| CommandError::InvalidContext {
		field: field.to_string(),
		message: format!("invalid url: {trimmed}"),
		hint: Some("Expected e.g. http://127.0.0.1:8500/".to_string()),
	})?;

	let scheme = url.scheme();
	if scheme != "http" {
		return Err(CommandError::InvalidContext {
			field: field.to_string(),
			message: format!("unsupported url scheme: {scheme}"),
			hint: Some("Phase 0 requires http://".to_string()),
		});
	}

	if url.username() != "" || url.password().is_some() {
		return Err(CommandError::InvalidContext {
			field: field.to_string(),
			message: "userinfo is not allowed in urls".to_string(),
			hint: Some("Do not embed credentials in URLs.".to_string()),
		});
	}
	if url.query().is_some() || url.fragment().is_some() {
		return Err(CommandError::InvalidContext {
			field: field.to_string(),
			message: "query/fragment is not allowed in urls".to_string(),
			hint: Some("Use a base URL only (no ?query or #fragment).".to_string()),
		});
	}

	// Ensure trailing slash for predictable URL joining.
	if url.path().is_empty() {
		url.set_path("/");
	}
	let mut s = url.to_string();
	if !s.ends_with('/') {
		s.push('/');
	}
	Ok(s)
}

fn normalize_optional_base_url(
	field: &str,
	raw: Option<String>,
) -> Result<Option<String>, CommandError> {
	let Some(s) = raw else { return Ok(None) };
	let trimmed = s.trim().to_string();
	if trimmed.is_empty() {
		return Ok(None);
	}
	Ok(Some(normalize_base_url(field, &trimmed)?))
}

fn build_consignment_template(base: &str) -> String {
	let trimmed = base.trim();
	if trimmed.contains("{txid}") {
		return trimmed.to_string();
	}
	if let Some(path) = trimmed.strip_prefix("file://") {
		let clean = path.trim_end_matches('/');
		return format!("file://{clean}/{{txid}}");
	}
	let clean = trimmed.trim_end_matches('/');
	format!("{clean}/{{txid}}?format=zip")
}

fn extract_host(input: Option<&str>) -> Option<String> {
	let mut value = input?.trim();
	if value.is_empty() {
		return None;
	}
	if let Some((_, rest)) = value.split_once("://") {
		value = rest;
	}
	let host_port = value.split('/').next()?.trim();
	if host_port.is_empty() || host_port.starts_with('[') {
		return None;
	}
	let host = host_port.split(':').next()?.trim();
	if host.is_empty() {
		return None;
	}
	Some(host.to_string())
}

fn derive_consignment_template_from_main_api(
	main_api_base_url: &str,
	p2p_listen: Option<&str>,
) -> Option<String> {
	let url = reqwest::Url::parse(main_api_base_url).ok()?;
	let mut host = url.host_str()?.to_string();
	let mut port = url.port();

	if host.eq_ignore_ascii_case("localhost") || host == "127.0.0.1" {
		if let Some(inferred_host) = extract_host(p2p_listen) {
			host = inferred_host.clone();
			// Local bootstrap compose nodes expose main API on 8500 inside docker network.
			if inferred_host.starts_with("rgb-node-") {
				port = Some(8500);
			}
		}
	}

	let mut origin = format!("{}://{}", url.scheme(), host);
	if let Some(p) = port {
		origin.push(':');
		origin.push_str(&p.to_string());
	}
	Some(format!(
		"{origin}/api/v1/rgb/consignments/{{txid}}?format=zip"
	))
}

fn normalize_context(mut ctx: NodeContext) -> Result<NodeContext, CommandError> {
	ctx.node_id = ctx.node_id.trim().to_string();
	if ctx.node_id.is_empty() {
		return Err(CommandError::InvalidContext {
			field: "node_id".to_string(),
			message: "missing node_id".to_string(),
			hint: Some("Use a stable identifier (e.g. a UUID).".to_string()),
		});
	}

	ctx.display_name = ctx.display_name.trim().to_string();
	if ctx.display_name.is_empty() {
		return Err(CommandError::InvalidContext {
			field: "display_name".to_string(),
			message: "missing display_name".to_string(),
			hint: Some("Pick a short operator-friendly label (e.g. \"Alice node\").".to_string()),
		});
	}

	ctx.main_api_base_url = normalize_base_url("main_api_base_url", &ctx.main_api_base_url)?;
	ctx.control_api_base_url =
		normalize_optional_base_url("control_api_base_url", ctx.control_api_base_url)?;
	ctx.rgb_consignment_base_url = match ctx.rgb_consignment_base_url.take() {
		Some(raw) if raw.trim().is_empty() => None,
		Some(raw) => Some(build_consignment_template(&raw)),
		None => derive_consignment_template_from_main_api(
			&ctx.main_api_base_url,
			ctx.p2p_listen.as_deref(),
		),
	};

	if !ctx.allow_non_loopback {
		let main = reqwest::Url::parse(&ctx.main_api_base_url).map_err(|_| CommandError::InvalidContext {
			field: "main_api_base_url".to_string(),
			message: "invalid url".to_string(),
			hint: Some("Expected e.g. http://127.0.0.1:8500/".to_string()),
		})?;
		let is_loopback = match main.host_str() {
			Some(h) if h.eq_ignore_ascii_case("localhost") => true,
			Some(h) => match h.parse::<std::net::IpAddr>() {
				Ok(ip) => ip.is_loopback(),
				Err(_) => false,
			},
			None => false,
		};
		if !is_loopback {
			return Err(CommandError::InvalidContext {
				field: "main_api_base_url".to_string(),
				message: "non-loopback url is blocked by default".to_string(),
				hint: Some("Use 127.0.0.1/localhost/::1 or enable allow_non_loopback.".to_string()),
			});
		}

		if let Some(control_raw) = ctx.control_api_base_url.as_deref() {
			let control = reqwest::Url::parse(control_raw).map_err(|_| CommandError::InvalidContext {
				field: "control_api_base_url".to_string(),
				message: "invalid url".to_string(),
				hint: Some("Expected e.g. http://127.0.0.1:8550/".to_string()),
			})?;
			let is_loopback = match control.host_str() {
				Some(h) if h.eq_ignore_ascii_case("localhost") => true,
				Some(h) => match h.parse::<std::net::IpAddr>() {
					Ok(ip) => ip.is_loopback(),
					Err(_) => false,
				},
				None => false,
			};
			if !is_loopback {
				return Err(CommandError::InvalidContext {
					field: "control_api_base_url".to_string(),
					message: "non-loopback url is blocked by default".to_string(),
					hint: Some("Use 127.0.0.1/localhost/::1 or enable allow_non_loopback.".to_string()),
				});
			}
		}
	}

	Ok(ctx)
}

#[tauri::command]
pub async fn contexts_list(state: State<'_, AppState>) -> Result<Vec<NodeContext>, CommandError> {
	Ok(state.store.list().await)
}

#[tauri::command]
pub async fn contexts_reload(state: State<'_, AppState>) -> Result<Vec<NodeContext>, CommandError> {
	state.store.reload().await?;
	Ok(state.store.list().await)
}

#[tauri::command]
pub async fn contexts_path(state: State<'_, AppState>) -> Result<String, CommandError> {
	Ok(state.store.path().display().to_string())
}

#[tauri::command]
pub async fn contexts_upsert(
	state: State<'_, AppState>,
	context: NodeContext,
) -> Result<(), CommandError> {
	let context = normalize_context(context)?;
	state.store.upsert(context).await
}

#[tauri::command]
pub async fn contexts_remove(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<(), CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	state.events.stop(&node_id).await?;
	docker_rm_for_context(&ctx)?;
	state.store.remove(&node_id).await
}


async fn get_ctx(store: &ContextStore, node_id: &str) -> Result<NodeContext, CommandError> {
	store.get(node_id).await.ok_or(CommandError::ContextNotFound {
		node_id: node_id.to_string(),
	})
}

async fn push_http_event(
	state: &State<'_, AppState>,
	node_id: &str,
	action: &str,
	phase: &str,
	duration_ms: Option<u64>,
	request: Option<serde_json::Value>,
	response: Option<serde_json::Value>,
	error: Option<serde_json::Value>,
) {
	state
		.events
		.push_external_event(
			node_id,
			rgbldkd_http::EventDto::NodeHttp {
				action: action.to_string(),
				phase: phase.to_string(),
				duration_ms,
				request,
				response,
				error,
			},
		)
		.await;
}

async fn traced_node_call<T, Fut>(
	state: &State<'_, AppState>,
	node_id: &str,
	action: &str,
	request: Option<serde_json::Value>,
	fut: Fut,
) -> Result<T, CommandError>
where
	T: Serialize,
	Fut: Future<Output = Result<T, CommandError>>,
{
	let include_response = *state.http_event_debug_responses.read().await;
	push_http_event(
		state,
		node_id,
		action,
		"request",
		None,
		request.clone(),
		None,
		None,
	)
	.await;
	let started = now_ms();
	let out = fut.await;
	let elapsed = now_ms().saturating_sub(started);
	match &out {
		Ok(v) => {
			let response = if include_response {
				serde_json::to_value(v).ok().map(compact_response_value)
			} else {
				None
			};
			push_http_event(
				state,
				node_id,
				action,
				"response",
				Some(elapsed),
				None,
				response,
				None,
			)
			.await;
		}
		Err(err) => {
			push_http_event(
				state,
				node_id,
				action,
				"error",
				Some(elapsed),
				None,
				None,
				serde_json::to_value(err).ok(),
			)
			.await;
		}
	}
	out
}

#[tauri::command]
pub async fn events_start_all(
	app: AppHandle,
	state: State<'_, AppState>,
) -> Result<(), CommandError> {
	let contexts = state.store.list().await;
	for ctx in contexts {
		let _ = state
			.events
			.start_for_context(app.clone(), state.http.clone(), ctx, state.logger.clone())
			.await;
	}
	Ok(())
}

#[tauri::command]
pub async fn events_start(
	app: AppHandle,
	state: State<'_, AppState>,
	node_id: String,
) -> Result<(), CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	state
		.events
		.start_for_context(app, state.http.clone(), ctx, state.logger.clone())
		.await
}

#[tauri::command]
pub async fn events_stop(state: State<'_, AppState>, node_id: String) -> Result<(), CommandError> {
	state.events.stop(&node_id).await
}

#[tauri::command]
pub async fn events_list(
	state: State<'_, AppState>,
	node_id: String,
	limit: Option<u32>,
) -> Result<Vec<StoredEvent>, CommandError> {
	let limit = limit.unwrap_or(200).min(1000) as usize;
	Ok(state.events.list(&node_id, limit).await)
}

#[tauri::command]
pub async fn events_clear(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<(), CommandError> {
	state.events.clear(&node_id).await;
	Ok(())
}

#[tauri::command]
pub async fn events_status(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<EventsStatus, CommandError> {
	Ok(state.events.status(&node_id).await)
}

#[tauri::command]
pub async fn events_status_all(
	state: State<'_, AppState>,
) -> Result<std::collections::HashMap<String, EventsStatus>, CommandError> {
	Ok(state.events.status_all().await)
}

#[tauri::command]
pub async fn events_http_debug_get(state: State<'_, AppState>) -> Result<bool, CommandError> {
	Ok(*state.http_event_debug_responses.read().await)
}

#[tauri::command]
pub async fn events_http_debug_set(
	state: State<'_, AppState>,
	enabled: bool,
) -> Result<(), CommandError> {
	*state.http_event_debug_responses.write().await = enabled;
	Ok(())
}

#[tauri::command]
pub async fn logs_path(state: State<'_, AppState>) -> Result<String, CommandError> {
	Ok(state.logger.path().display().to_string())
}

#[tauri::command]
pub async fn logs_tail(
	state: State<'_, AppState>,
	limit: Option<u32>,
) -> Result<Vec<String>, CommandError> {
	let limit = limit.unwrap_or(200) as usize;
	state.logger.tail_lines(limit).await
}

#[tauri::command]
pub async fn log_ui(
	state: State<'_, AppState>,
	level: String,
	message: String,
	context: Option<serde_json::Value>,
) -> Result<(), CommandError> {
	let level = LogLevel::parse(&level).ok_or(CommandError::InvalidLogLevel { level })?;
	state
		.logger
		.append(LogEntry {
			ts_ms: now_ms(),
			source: "ui".to_string(),
			level,
			message,
			context,
		})
		.await
}

#[derive(Debug, Clone, Serialize)]
pub struct NodeHttpProxyResponse {
	pub status: u16,
	pub ok: bool,
	pub body: String,
}

fn read_token_file(path: &std::path::Path) -> Result<String, CommandError> {
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

async fn import_rgb_issuer_raw(
	client: &reqwest::Client,
	ctx: &NodeContext,
	issuer_name: &str,
	issuer_bytes: &[u8],
) -> Result<(), CommandError> {
	let base = reqwest::Url::parse(&ctx.main_api_base_url).map_err(|_| CommandError::InvalidBaseUrl {
		url: ctx.main_api_base_url.clone(),
	})?;
	let mut url = base
		.join("api/v1/rgb/issuers/import")
		.map_err(|_| CommandError::InvalidBaseUrl {
			url: ctx.main_api_base_url.clone(),
		})?;
	{
		let mut qp = url.query_pairs_mut();
		qp.append_pair("name", issuer_name);
		qp.append_pair("format", "raw");
	}

	let mut req = client
		.post(url)
		.header("content-type", "application/octet-stream")
		.body(issuer_bytes.to_vec());
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(std::path::Path::new(path))?;
		req = req.bearer_auth(token);
	}

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		let status = resp.status().as_u16();
		let body = resp.text().await.unwrap_or_default();
		return Err(CommandError::BadRequest {
			service: "main",
			message: Some(format!(
				"rgb issuer import failed ({status}): {}",
				body.chars().take(300).collect::<String>()
			)),
			hint: Some("Check issuer file format and RGB node readiness.".to_string()),
		});
	}

	Ok(())
}

#[derive(Debug, Clone)]
struct RpcConfig {
	host: String,
	port: String,
	user: String,
	password: String,
}

fn run_command_capture(program: &str, args: &[String]) -> Result<String, String> {
	let resolved_program = resolve_executable(program).unwrap_or_else(|| PathBuf::from(program));
	let output = Command::new(&resolved_program)
		.args(args)
		.output()
		.map_err(|e| format!("{program}: {e}"))?;

	if !output.status.success() {
		let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
		let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
		let details = if !stderr.is_empty() {
			stderr
		} else if !stdout.is_empty() {
			stdout
		} else {
			format!("exit status {}", output.status)
		};
		return Err(format!("{program}: {details}"));
	}

	Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn run_command_status(program: &str, args: &[String]) -> Result<(), String> {
	let resolved_program = resolve_executable(program).unwrap_or_else(|| PathBuf::from(program));
	let output = Command::new(&resolved_program)
		.args(args)
		.output()
		.map_err(|e| format!("{program}: {e}"))?;

	if output.status.success() {
		return Ok(());
	}

	let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
	let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
	let details = if !stderr.is_empty() {
		stderr
	} else if !stdout.is_empty() {
		stdout
	} else {
		format!("exit status {}", output.status)
	};
	Err(format!("{program}: {details}"))
}

fn run_command_capture_in_dir(
	program: &str,
	args: &[String],
	cwd: &std::path::Path,
) -> Result<String, String> {
	run_command_capture_in_dir_with_env(program, args, cwd, &[])
}

fn run_command_capture_in_dir_with_env(
	program: &str,
	args: &[String],
	cwd: &std::path::Path,
	envs: &[(&str, &str)],
) -> Result<String, String> {
	let resolved_program = resolve_executable(program).unwrap_or_else(|| PathBuf::from(program));
	let output = Command::new(&resolved_program)
		.current_dir(cwd)
		.envs(envs.iter().copied())
		.args(args)
		.output()
		.map_err(|e| format!("{program}: {e}"))?;

	if !output.status.success() {
		let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
		let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
		let details = if !stderr.is_empty() {
			stderr
		} else if !stdout.is_empty() {
			stdout
		} else {
			format!("exit status {}", output.status)
		};
		return Err(format!("{program}: {details}"));
	}

	Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn resolve_executable(program: &str) -> Option<PathBuf> {
	let p = Path::new(program);
	if p.components().count() > 1 {
		return if p.exists() { Some(p.to_path_buf()) } else { None };
	}

	for candidate in executable_candidates(program) {
		if candidate.exists() {
			return Some(candidate);
		}
	}
	None
}

fn executable_candidates(program: &str) -> Vec<PathBuf> {
	let mut out = Vec::new();

	if let Some(path) = std::env::var_os("PATH") {
		for dir in std::env::split_paths(&path) {
			push_program_candidates(&mut out, &dir, program);
		}
	}

	// GUI apps (packaged) may have a minimal PATH; include common binary locations.
	for dir in [
		"/usr/local/bin",
		"/opt/homebrew/bin",
		"/usr/bin",
		"/bin",
		"/Applications/Docker.app/Contents/Resources/bin",
	] {
		push_program_candidates(&mut out, Path::new(dir), program);
	}

	out
}

fn push_program_candidates(out: &mut Vec<PathBuf>, dir: &Path, program: &str) {
	out.push(dir.join(program));
	#[cfg(target_os = "windows")]
	{
		out.push(dir.join(format!("{program}.exe")));
	}
}

fn ensure_parent_dir(path: &std::path::Path) -> Result<(), CommandError> {
	if let Some(parent) = path.parent() {
		std::fs::create_dir_all(parent).map_err(|_| CommandError::Io)?;
	}
	Ok(())
}

fn make_secret_file(path: &std::path::Path, min_len: usize) -> Result<(), CommandError> {
	ensure_parent_dir(path)?;
	let nanos = std::time::SystemTime::now()
		.duration_since(std::time::UNIX_EPOCH)
		.map_err(|_| CommandError::Io)?
		.as_nanos();
	let raw = format!("{}:{}:{}:{}", std::process::id(), nanos, path.display(), min_len);
	let mut secret = general_purpose::STANDARD.encode(raw.as_bytes());
	while secret.len() < min_len {
		secret.push('x');
	}
	std::fs::write(path, secret).map_err(|_| CommandError::Io)?;
	Ok(())
}

fn ensure_secret_file(path: &std::path::Path, min_len: usize) -> Result<(), CommandError> {
	if path.exists() {
		let current = std::fs::read_to_string(path).map_err(|_| CommandError::Io)?;
		if current.trim().len() >= min_len {
			return Ok(());
		}
	}
	make_secret_file(path, min_len)
}

fn is_not_found_error(msg: &str) -> bool {
	let lower = msg.to_ascii_lowercase();
	lower.contains("no such container") || lower.contains("no such volume")
}

fn docker_cli_available() -> bool {
	run_command_status("docker", &["--version".to_string()]).is_ok()
}

fn docker_rm_for_context(ctx: &NodeContext) -> Result<(), CommandError> {
	if !docker_cli_available() {
		return Ok(());
	}

	let mut ids: Vec<String> = Vec::new();
	let by_label = run_command_capture(
		"docker",
		&[
			"ps".to_string(),
			"-aq".to_string(),
			"--filter".to_string(),
			format!("label=org.rgbldk.node_id={}", ctx.node_id),
		],
	)
	.unwrap_or_default();

	for line in by_label.lines() {
		let id = line.trim();
		if !id.is_empty() {
			ids.push(id.to_string());
		}
	}

	if ids.is_empty() {
		if let Ok(url) = reqwest::Url::parse(&ctx.main_api_base_url) {
			if let Some(port) = url.port_or_known_default() {
				let by_port = run_command_capture(
					"docker",
					&[
						"ps".to_string(),
						"-aq".to_string(),
						"--filter".to_string(),
						format!("publish={port}"),
					],
				)
				.unwrap_or_default();
				for line in by_port.lines() {
					let id = line.trim();
					if !id.is_empty() {
						ids.push(id.to_string());
					}
				}
			}
		}
	}

	for id in ids {
		if let Err(e) = run_command_status("docker", &["rm".to_string(), "-f".to_string(), id.clone()]) {
			if !is_not_found_error(&e) {
				return Err(CommandError::ExternalCommandFailed {
					command: "docker rm -f".to_string(),
					message: Some(e),
					hint: Some("Remove the container manually and retry.".to_string()),
				});
			}
		}
	}

	if let Some(data_dir) = ctx.data_dir.as_deref() {
		if let Some(volume_name) = data_dir.strip_prefix("docker-volume:") {
			if let Err(e) = run_command_status(
				"docker",
				&["volume".to_string(), "rm".to_string(), volume_name.to_string()],
			) {
				if !is_not_found_error(&e) {
					return Err(CommandError::ExternalCommandFailed {
						command: "docker volume rm".to_string(),
						message: Some(e),
						hint: Some("Remove the volume manually if no longer needed.".to_string()),
					});
				}
			}
		}
	}

	Ok(())
}

fn rpc_config_from_env() -> Option<RpcConfig> {
	let host_port = std::env::var("BITCOIND_RPC").ok()?;
	let (host, port) = host_port.rsplit_once(':')?;
	let user = std::env::var("BITCOIND_RPC_USER").unwrap_or_else(|_| "btcuser".to_string());
	let password = std::env::var("BITCOIND_RPC_PASSWORD").unwrap_or_else(|_| "btcpass".to_string());
	Some(RpcConfig {
		host: host.to_string(),
		port: port.to_string(),
		user,
		password,
	})
}

fn rpc_config_localhost() -> RpcConfig {
	let user = std::env::var("BITCOIND_RPC_USER").unwrap_or_else(|_| "btcuser".to_string());
	let password = std::env::var("BITCOIND_RPC_PASSWORD").unwrap_or_else(|_| "btcpass".to_string());
	RpcConfig {
		host: "127.0.0.1".to_string(),
		port: "18443".to_string(),
		user,
		password,
	}
}

fn bitcoin_cli_via_rpc(args: &[&str], rpc: &RpcConfig) -> Result<String, String> {
	let mut argv = vec![
		"-regtest".to_string(),
		format!("-rpcconnect={}", rpc.host),
		format!("-rpcport={}", rpc.port),
		format!("-rpcuser={}", rpc.user),
		format!("-rpcpassword={}", rpc.password),
	];
	argv.extend(args.iter().map(|s| (*s).to_string()));
	run_command_capture("bitcoin-cli", &argv)
}

fn detect_bitcoind_container() -> Option<String> {
	let output = run_command_capture("docker", &["ps".to_string(), "--format".to_string(), "{{.Names}}".to_string()]).ok()?;
	output
		.lines()
		.map(|line| line.trim())
		.find(|line| {
			let l = line.to_ascii_lowercase();
			l.contains("bitcoind") || l.contains("bitcoin")
		})
		.map(ToOwned::to_owned)
}

fn bitcoin_cli_via_docker(args: &[&str], container: &str) -> Result<String, String> {
	let mut argv = vec![
		"exec".to_string(),
		"-i".to_string(),
		container.to_string(),
		"bitcoin-cli".to_string(),
		"-regtest".to_string(),
		"-rpcuser=btcuser".to_string(),
		"-rpcpassword=btcpass".to_string(),
	];
	argv.extend(args.iter().map(|s| (*s).to_string()));
	run_command_capture("docker", &argv)
}

fn bitcoin_cli(args: &[&str]) -> Result<String, CommandError> {
	let mut attempts: Vec<String> = Vec::new();

	if let Some(rpc) = rpc_config_from_env() {
		match bitcoin_cli_via_rpc(args, &rpc) {
			Ok(v) => return Ok(v),
			Err(e) => attempts.push(format!("BITCOIND_RPC {}:{} -> {e}", rpc.host, rpc.port)),
		}
	}

	let container = std::env::var("BITCOIND_CONTAINER")
		.ok()
		.filter(|s| !s.trim().is_empty())
		.or_else(detect_bitcoind_container);
	if let Some(container_name) = container {
		match bitcoin_cli_via_docker(args, &container_name) {
			Ok(v) => return Ok(v),
			Err(e) => attempts.push(format!("docker container {container_name} -> {e}")),
		}
	}

	let local = rpc_config_localhost();
	match bitcoin_cli_via_rpc(args, &local) {
		Ok(v) => return Ok(v),
		Err(e) => attempts.push(format!("localhost {}:{} -> {e}", local.host, local.port)),
	}

	Err(CommandError::ExternalCommandFailed {
		command: "bitcoin-cli".to_string(),
		message: Some(format!(
			"failed to reach regtest bitcoind. attempts: {}",
			attempts.join(" | ")
		)),
		hint: Some(
			"Set BITCOIND_RPC=host:port (with BITCOIND_RPC_USER/PASSWORD), or BITCOIND_CONTAINER, or expose localhost:18443."
				.to_string(),
		),
	})
}

fn bitcoin_utxo_for_sent_address(txid: &str, address: &str) -> Result<String, CommandError> {
	let tx_out = bitcoin_cli(&["gettransaction", txid])?;
	let tx_json: serde_json::Value = serde_json::from_str(&tx_out).map_err(|_| CommandError::ExternalCommandFailed {
		command: "bitcoin-cli gettransaction".to_string(),
		message: Some(format!("unexpected gettransaction response: {tx_out}")),
		hint: None,
	})?;
	let hex = tx_json
		.get("hex")
		.and_then(|x| x.as_str())
		.ok_or(CommandError::ExternalCommandFailed {
			command: "bitcoin-cli gettransaction".to_string(),
			message: Some("missing hex in gettransaction response".to_string()),
			hint: None,
		})?;
	let dec_out = bitcoin_cli(&["decoderawtransaction", hex])?;
	let dec_json: serde_json::Value = serde_json::from_str(&dec_out).map_err(|_| CommandError::ExternalCommandFailed {
		command: "bitcoin-cli decoderawtransaction".to_string(),
		message: Some(format!("unexpected decoderawtransaction response: {dec_out}")),
		hint: None,
	})?;
	let vouts = dec_json
		.get("vout")
		.and_then(|x| x.as_array())
		.ok_or(CommandError::ExternalCommandFailed {
			command: "bitcoin-cli decoderawtransaction".to_string(),
			message: Some("missing vout in decoded transaction".to_string()),
			hint: None,
		})?;

	for v in vouts {
		let n = match v.get("n").and_then(|x| x.as_u64()) {
			Some(x) => x,
			None => continue,
		};
		let spk = match v.get("scriptPubKey") {
			Some(x) => x,
			None => continue,
		};
		if spk.get("address").and_then(|x| x.as_str()) == Some(address) {
			return Ok(format!("{txid}:{n}"));
		}
		let has_addr = spk
			.get("addresses")
			.and_then(|x| x.as_array())
			.map(|arr| arr.iter().any(|a| a.as_str() == Some(address)))
			.unwrap_or(false);
		if has_addr {
			return Ok(format!("{txid}:{n}"));
		}
	}

	Err(CommandError::ExternalCommandFailed {
		command: "bitcoin-cli decoderawtransaction".to_string(),
		message: Some(format!(
			"no transaction output found for address {address} in tx {txid}"
		)),
		hint: Some("Verify sendtoaddress target and retry bootstrap.".to_string()),
	})
}

#[derive(Debug, Clone, Serialize)]
pub struct DockerEnvironmentResponse {
	pub installed: bool,
	pub daemon_running: bool,
	pub version: Option<String>,
	pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BootstrapLocalNodeResponse {
	pub node_id: String,
	pub display_name: String,
	pub container_name: String,
	pub main_api_base_url: String,
	pub control_api_base_url: String,
	pub main_api_port: u16,
	pub control_api_port: u16,
	pub p2p_port: u16,
	pub created: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct BootstrapLocalEnvironmentNode {
	pub node_id: String,
	pub display_name: String,
	pub main_api_base_url: String,
	pub control_api_base_url: String,
	pub wallet_address: String,
	pub funded_btc: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct BootstrapLocalEnvironmentResponse {
	pub compose_file: String,
	pub services: Vec<String>,
	pub container_status: String,
	pub stage_logs: Vec<String>,
	pub created_nodes: Vec<BootstrapLocalEnvironmentNode>,
	pub mined_blocks: u32,
	pub mined_to_address: String,
	pub chain_height: u64,
}

async fn rgb_new_address(client: &reqwest::Client, ctx: &NodeContext) -> Result<String, CommandError> {
	let base = reqwest::Url::parse(&ctx.main_api_base_url).map_err(|_| CommandError::InvalidBaseUrl {
		url: ctx.main_api_base_url.clone(),
	})?;
	let url = base.join("api/v1/rgb/new_address").map_err(|_| CommandError::InvalidBaseUrl {
		url: ctx.main_api_base_url.clone(),
	})?;
	let mut req = client.post(url).json(&serde_json::json!({}));
	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(std::path::Path::new(path))?;
		req = req.bearer_auth(token);
	}
	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	let status = resp.status().as_u16();
	if !resp.status().is_success() {
		return Err(CommandError::UnexpectedHttpStatus {
			service: "main",
			status,
		});
	}
	let v = resp
		.json::<serde_json::Value>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)?;
	let Some(addr) = v.get("address").and_then(|x| x.as_str()) else {
		return Err(CommandError::HttpRequestFailed);
	};
	Ok(addr.to_string())
}

async fn ensure_rgb_wallet_ready(
	client: &reqwest::Client,
	ctx: &NodeContext,
	retries: usize,
	delay_ms: u64,
) -> Result<String, CommandError> {
	let mut last_err: Option<CommandError> = None;
	for _ in 0..retries {
		match rgb_new_address(client, ctx).await {
			Ok(addr) => return Ok(addr),
			Err(err) => {
				last_err = Some(err);
				tokio::time::sleep(Duration::from_millis(delay_ms)).await;
			}
		}
	}
	Err(last_err.unwrap_or(CommandError::HttpRequestFailed))
}

fn extract_port_from_url(url: &str) -> Option<u16> {
	let parsed = reqwest::Url::parse(url).ok()?;
	parsed.port_or_known_default()
}

fn next_free_port(used: &HashSet<u16>, start: u16) -> Option<u16> {
	(start..=u16::MAX).find(|p| !used.contains(p))
}

fn sanitize_slug(input: &str) -> String {
	let mut out = String::new();
	let mut prev_dash = false;
	for ch in input.chars() {
		let mapped = if ch.is_ascii_alphanumeric() {
			ch.to_ascii_lowercase()
		} else {
			'-'
		};
		if mapped == '-' {
			if prev_dash {
				continue;
			}
			prev_dash = true;
		} else {
			prev_dash = false;
		}
		out.push(mapped);
	}
	out.trim_matches('-').to_string()
}

fn random_suffix() -> String {
	let nanos = std::time::SystemTime::now()
		.duration_since(std::time::UNIX_EPOCH)
		.unwrap_or_default()
		.as_nanos();
	let pid = std::process::id() as u128;
	let mixed = nanos ^ (pid << 32);
	let s = format!("{mixed:x}");
	let len = s.len();
	if len > 6 {
		s[len - 6..].to_string()
	} else {
		s
	}
}

#[tauri::command]
pub async fn docker_environment() -> Result<DockerEnvironmentResponse, CommandError> {
	let version_out = run_command_capture("docker", &["--version".to_string()]);
	let version = match version_out {
		Ok(v) => Some(v),
		Err(e) => {
			return Ok(DockerEnvironmentResponse {
				installed: false,
				daemon_running: false,
				version: None,
				detail: Some(e),
			})
		}
	};

	let info_ok = run_command_status("docker", &["info".to_string()]);
	match info_ok {
		Ok(_) => Ok(DockerEnvironmentResponse {
			installed: true,
			daemon_running: true,
			version,
			detail: None,
		}),
		Err(e) => Ok(DockerEnvironmentResponse {
			installed: true,
			daemon_running: false,
			version,
			detail: Some(e),
		}),
	}
}

#[tauri::command]
pub async fn bootstrap_local_environment(
	state: State<'_, AppState>,
) -> Result<BootstrapLocalEnvironmentResponse, CommandError> {
	let env = docker_environment().await?;
	if !env.installed {
		return Err(CommandError::ExternalCommandFailed {
			command: "docker".to_string(),
			message: Some("docker is not installed".to_string()),
			hint: Some("Install Docker Desktop/Engine and retry.".to_string()),
		});
	}
	if !env.daemon_running {
		return Err(CommandError::ExternalCommandFailed {
			command: "docker info".to_string(),
			message: Some("docker daemon is not running".to_string()),
			hint: Some("Start Docker Desktop/daemon and retry.".to_string()),
		});
	}

	let mut stage_logs: Vec<String> = Vec::new();
	let config_dir = app_dirs::config_dir()?;
	let data_dir = app_dirs::data_dir()?;
	let contexts_file = config_dir.join("contexts.json");
	let runtime_root = data_dir.join("local-environment");
	let local_nodes_root = data_dir.join("local-nodes");
	let node1_secrets = runtime_root.join("node1").join("secrets");
	let node2_secrets = runtime_root.join("node2").join("secrets");
	let node1_data = runtime_root.join("node1").join("data");
	let node2_data = runtime_root.join("node2").join("data");
	let generated_compose = runtime_root.join("docker-compose.generated.yml");

	// Always start from a clean local state during quick-start initialization.
	if contexts_file.exists() {
		std::fs::remove_file(&contexts_file).map_err(|_| CommandError::Io)?;
		stage_logs.push(format!("Removed old contexts file: {}.", contexts_file.display()));
	}
	let existing_contexts = state.store.list().await;
	for c in existing_contexts {
		state.store.remove(&c.node_id).await?;
	}
	stage_logs.push("Cleared previously configured node contexts.".to_string());
	if runtime_root.exists() {
		std::fs::remove_dir_all(&runtime_root).map_err(|_| CommandError::Io)?;
		stage_logs.push(format!(
			"Removed old runtime user files: {}.",
			runtime_root.display()
		));
	}
	if local_nodes_root.exists() {
		std::fs::remove_dir_all(&local_nodes_root).map_err(|_| CommandError::Io)?;
		stage_logs.push(format!(
			"Removed old local-node user files: {}.",
			local_nodes_root.display()
		));
	}
	// Backward compatibility: also clean legacy app directories used by older builds.
	if let Some(legacy_dirs) = directories::ProjectDirs::from(
		"org",
		"rgbldk",
		"rgb-ldk-control-panel",
	) {
		let legacy_contexts = legacy_dirs.config_dir().join("contexts.json");
		if legacy_contexts.exists() {
			std::fs::remove_file(&legacy_contexts).map_err(|_| CommandError::Io)?;
			stage_logs.push(format!(
				"Removed legacy contexts file: {}.",
				legacy_contexts.display()
			));
		}
		let legacy_runtime_root = legacy_dirs.data_local_dir().join("local-environment");
		if legacy_runtime_root.exists() {
			std::fs::remove_dir_all(&legacy_runtime_root).map_err(|_| CommandError::Io)?;
			stage_logs.push(format!(
				"Removed legacy runtime user files: {}.",
				legacy_runtime_root.display()
			));
		}
		let legacy_local_nodes_root = legacy_dirs.data_local_dir().join("local-nodes");
		if legacy_local_nodes_root.exists() {
			std::fs::remove_dir_all(&legacy_local_nodes_root).map_err(|_| CommandError::Io)?;
			stage_logs.push(format!(
				"Removed legacy local-node user files: {}.",
				legacy_local_nodes_root.display()
			));
		}
	}

	let (compose_template, compose_template_source) =
		if let Ok(v) = std::env::var("RGB_LDK_DOCKER_COMPOSE_FILE") {
			let p = PathBuf::from(v.trim());
			if p.exists() {
				let content = std::fs::read_to_string(&p).map_err(|_| CommandError::Io)?;
				(content, format!("env RGB_LDK_DOCKER_COMPOSE_FILE ({})", p.display()))
			} else {
				return Err(CommandError::ExternalCommandFailed {
					command: "docker compose".to_string(),
					message: Some(format!(
						"RGB_LDK_DOCKER_COMPOSE_FILE does not exist: {}",
						p.display()
					)),
					hint: Some(
						"Set RGB_LDK_DOCKER_COMPOSE_FILE to a valid docker-compose.yml path."
							.to_string(),
					),
				});
			}
		} else {
			let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
			let root = manifest_dir.parent().ok_or(CommandError::Io)?.to_path_buf();
			let p = root.join("docker-compose.yml");
			if p.exists() {
				let content = std::fs::read_to_string(&p).map_err(|_| CommandError::Io)?;
				(content, format!("workspace {}", p.display()))
			} else {
				(
					BUILTIN_DOCKER_COMPOSE_YML.to_string(),
					"embedded builtin template".to_string(),
				)
			}
		};
	stage_logs.push(format!("Using compose template source: {compose_template_source}."));

	std::fs::create_dir_all(&runtime_root).map_err(|_| CommandError::Io)?;
	if node1_data.exists() {
		std::fs::remove_dir_all(&node1_data).map_err(|_| CommandError::Io)?;
	}
	if node2_data.exists() {
		std::fs::remove_dir_all(&node2_data).map_err(|_| CommandError::Io)?;
	}
	std::fs::create_dir_all(&node1_secrets).map_err(|_| CommandError::Io)?;
	std::fs::create_dir_all(&node2_secrets).map_err(|_| CommandError::Io)?;
	std::fs::create_dir_all(&node1_data).map_err(|_| CommandError::Io)?;
	std::fs::create_dir_all(&node2_data).map_err(|_| CommandError::Io)?;

	ensure_secret_file(&node1_secrets.join("http.token"), 16)?;
	ensure_secret_file(&node1_secrets.join("control-http.token"), 16)?;
	ensure_secret_file(&node1_secrets.join("keystore.passphrase"), 16)?;
	ensure_secret_file(&node2_secrets.join("http.token"), 16)?;
	ensure_secret_file(&node2_secrets.join("control-http.token"), 16)?;
	ensure_secret_file(&node2_secrets.join("keystore.passphrase"), 16)?;
	stage_logs.push(format!(
		"Prepared node secrets and reset data directories under {}.",
		runtime_root.display()
	));

	let mount1_http = format!(
		"      - \"{}:/run/secrets/rgbldk_http_token:ro\"",
		node1_secrets.join("http.token").display()
	);
	let mount1_ctrl = format!(
		"      - \"{}:/run/secrets/rgbldk_control_http_token:ro\"",
		node1_secrets.join("control-http.token").display()
	);
	let mount1_pass = format!(
		"      - \"{}:/run/secrets/rgbldk_keystore_passphrase:ro\"",
		node1_secrets.join("keystore.passphrase").display()
	);
	let mount2_http = format!(
		"      - \"{}:/run/secrets/rgbldk_http_token:ro\"",
		node2_secrets.join("http.token").display()
	);
	let mount2_ctrl = format!(
		"      - \"{}:/run/secrets/rgbldk_control_http_token:ro\"",
		node2_secrets.join("control-http.token").display()
	);
	let mount2_pass = format!(
		"      - \"{}:/run/secrets/rgbldk_keystore_passphrase:ro\"",
		node2_secrets.join("keystore.passphrase").display()
	);
	let generated = compose_template
		.replace(
			"      - ./example/node1/secrets/http.token:/run/secrets/rgbldk_http_token:ro",
			&mount1_http,
		)
		.replace(
			"      - ./example/node1/secrets/control-http.token:/run/secrets/rgbldk_control_http_token:ro",
			&mount1_ctrl,
		)
		.replace(
			"      - ./example/node1/secrets/keystore.passphrase:/run/secrets/rgbldk_keystore_passphrase:ro",
			&mount1_pass,
		)
		.replace(
			"      - ./example/node2/secrets/http.token:/run/secrets/rgbldk_http_token:ro",
			&mount2_http,
		)
		.replace(
			"      - ./example/node2/secrets/control-http.token:/run/secrets/rgbldk_control_http_token:ro",
			&mount2_ctrl,
		)
		.replace(
			"      - ./example/node2/secrets/keystore.passphrase:/run/secrets/rgbldk_keystore_passphrase:ro",
			&mount2_pass,
		);
	std::fs::write(&generated_compose, generated).map_err(|_| CommandError::Io)?;
	stage_logs.push(format!(
		"Generated compose file for desktop runtime: {}",
		generated_compose.display()
	));

	let compose_file_str = generated_compose.to_string_lossy().to_string();
	let services_output = run_command_capture_in_dir(
		"docker",
		&[
			"compose".to_string(),
			"-f".to_string(),
			compose_file_str.clone(),
			"config".to_string(),
			"--services".to_string(),
		],
		&runtime_root,
	)
	.map_err(|e| CommandError::ExternalCommandFailed {
		command: "docker compose config --services".to_string(),
		message: Some(e),
		hint: None,
	})?;
	let services: Vec<String> = services_output
		.lines()
		.map(str::trim)
		.filter(|s| !s.is_empty())
		.map(ToOwned::to_owned)
		.collect();
	stage_logs.push(format!("Compose services: {}", services.join(", ")));

	let _ = run_command_capture_in_dir(
		"docker",
		&[
			"compose".to_string(),
			"-f".to_string(),
			compose_file_str.clone(),
			"down".to_string(),
			"-v".to_string(),
			"--remove-orphans".to_string(),
		],
		&runtime_root,
	);
	stage_logs.push("Reset previous compose containers/volumes for a clean local environment.".to_string());

	run_command_capture_in_dir(
		"docker",
		&[
			"compose".to_string(),
			"-f".to_string(),
			compose_file_str.clone(),
			"up".to_string(),
			"-d".to_string(),
			"--force-recreate".to_string(),
		],
		&runtime_root,
	)
	.map_err(|e| CommandError::ExternalCommandFailed {
		command: "docker compose up -d".to_string(),
		message: Some(e),
		hint: Some("Check docker compose logs for startup failures.".to_string()),
	})?;
	stage_logs.push("Started docker services from generated compose.".to_string());

	let container_status = run_command_capture_in_dir(
		"docker",
		&[
			"compose".to_string(),
			"-f".to_string(),
			compose_file_str,
			"ps".to_string(),
		],
		&runtime_root,
	)
	.map_err(|e| CommandError::ExternalCommandFailed {
		command: "docker compose ps".to_string(),
		message: Some(e),
		hint: None,
	})?;
	stage_logs.push("Collected container status details.".to_string());

	let ctx_file = config_dir.join("contexts.json");
	let contexts_json = format!(
		r#"{{
  "version": 1,
  "contexts": [
    {{
      "node_id": "alex",
      "display_name": "Alex",
      "main_api_base_url": "http://127.0.0.1:8501/",
      "main_api_token_file_path": "{}",
      "control_api_base_url": "http://127.0.0.1:8551/",
      "control_api_token_file_path": "{}",
      "data_dir": "{}",
      "p2p_listen": "rgb-node-alice:9735",
		"rgb_consignment_base_url": "http://rgb-node-alice:8500/api/v1/rgb/consignments/{{txid}}?format=zip",
      "allow_non_loopback": false,
			"network": "regtest"
    }},
    {{
      "node_id": "bob",
      "display_name": "Bob",
      "main_api_base_url": "http://127.0.0.1:8602/",
      "main_api_token_file_path": "{}",
      "control_api_base_url": "http://127.0.0.1:8653/",
      "control_api_token_file_path": "{}",
      "data_dir": "{}",
      "p2p_listen": "rgb-node-bob:9735",
		"rgb_consignment_base_url": "http://rgb-node-bob:8500/api/v1/rgb/consignments/{{txid}}?format=zip",
      "allow_non_loopback": false,
			"network": "regtest"
    }}
  ]
}}"#,
		node1_secrets.join("http.token").display(),
		node1_secrets.join("control-http.token").display(),
		node1_data.display(),
		node2_secrets.join("http.token").display(),
		node2_secrets.join("control-http.token").display(),
		node2_data.display(),
	);
	if let Some(parent) = ctx_file.parent() {
		std::fs::create_dir_all(parent).map_err(|_| CommandError::Io)?;
	}
	std::fs::write(&ctx_file, contexts_json).map_err(|_| CommandError::Io)?;
	state.store.reload().await?;
	stage_logs.push(format!("Wrote contexts to {}.", ctx_file.display()));

	let alex = NodeContext {
		node_id: "alex".to_string(),
		display_name: "Alex".to_string(),
		main_api_base_url: "http://127.0.0.1:8501/".to_string(),
		main_api_token_file_path: Some(node1_secrets.join("http.token").to_string_lossy().to_string()),
		control_api_base_url: Some("http://127.0.0.1:8551/".to_string()),
		control_api_token_file_path: Some(
			node1_secrets
				.join("control-http.token")
				.to_string_lossy()
				.to_string(),
		),
		data_dir: Some(node1_data.to_string_lossy().to_string()),
		p2p_listen: Some("rgb-node-alice:9735".to_string()),
		rgb_consignment_base_url: Some(
			"http://rgb-node-alice:8500/api/v1/rgb/consignments/{txid}?format=zip".to_string(),
		),
		allow_non_loopback: false,
		network: "regtest".to_string()
	};
	let bob = NodeContext {
		node_id: "bob".to_string(),
		display_name: "Bob".to_string(),
		main_api_base_url: "http://127.0.0.1:8602/".to_string(),
		main_api_token_file_path: Some(node2_secrets.join("http.token").to_string_lossy().to_string()),
		control_api_base_url: Some("http://127.0.0.1:8653/".to_string()),
		control_api_token_file_path: Some(
			node2_secrets
				.join("control-http.token")
				.to_string_lossy()
				.to_string(),
		),
		data_dir: Some(node2_data.to_string_lossy().to_string()),
		p2p_listen: Some("rgb-node-bob:9735".to_string()),
		rgb_consignment_base_url: Some(
			"http://rgb-node-bob:8500/api/v1/rgb/consignments/{txid}?format=zip".to_string(),
		),
		allow_non_loopback: false,
		network: "regtest".to_string()
	};
	state.store.upsert(alex.clone()).await?;
	state.store.upsert(bob.clone()).await?;
	stage_logs.push("Created/updated contexts for Alex and Bob.".to_string());

	for _ in 0..60 {
		let alex_ok = rgbldkd_http::main_status(&state.http, &alex).await.is_ok();
		let bob_ok = rgbldkd_http::main_status(&state.http, &bob).await.is_ok();
		if alex_ok && bob_ok {
			break;
		}
		tokio::time::sleep(Duration::from_secs(1)).await;
	}

	let mut alex_unlocked = false;
	let mut bob_unlocked = false;
	for _ in 0..60 {
		// Prefer status check first; some backends may reject repeated unlock calls once already unlocked.
		if let Ok(st) = rgbldkd_http::control_status(&state.http, &alex).await {
			if !st.locked {
				alex_unlocked = true;
			}
		}
		if !alex_unlocked && rgbldkd_http::control_unlock(&state.http, &alex).await.is_ok() {
			if let Ok(st) = rgbldkd_http::control_status(&state.http, &alex).await {
				alex_unlocked = !st.locked;
			}
		}

		if let Ok(st) = rgbldkd_http::control_status(&state.http, &bob).await {
			if !st.locked {
				bob_unlocked = true;
			}
		}
		if !bob_unlocked && rgbldkd_http::control_unlock(&state.http, &bob).await.is_ok() {
			if let Ok(st) = rgbldkd_http::control_status(&state.http, &bob).await {
				bob_unlocked = !st.locked;
			}
		}

		if alex_unlocked && bob_unlocked {
			break;
		}
		tokio::time::sleep(Duration::from_secs(1)).await;
	}
	if !alex_unlocked || !bob_unlocked {
			return Err(CommandError::ExternalCommandFailed {
				command: "control_unlock".to_string(),
				message: Some(format!(
					"node unlock failed: alex_unlocked={}, bob_unlocked={}",
					alex_unlocked, bob_unlocked
				)),
				hint: Some(
					"In the app: go to Nodes → Actions → Unlock. If it fails, edit the node context to set Control API Base URL + Token file path, then try again. For local Docker nodes, also confirm the token/passphrase files are mounted into the container."
						.to_string(),
				),
			});
		}
	stage_logs.push("Verified Alex/Bob are unlocked.".to_string());

	let alex_wallet_addr = rgbldkd_http::wallet_new_address(&state.http, &alex)
		.await?
		.address;
	let bob_wallet_addr = rgbldkd_http::wallet_new_address(&state.http, &bob)
		.await?
		.address;
	stage_logs.push(format!("Alex wallet address: {alex_wallet_addr}"));
	stage_logs.push(format!("Bob wallet address: {bob_wallet_addr}"));

	let alex_rgb_addr = ensure_rgb_wallet_ready(&state.http, &alex, 40, 500).await?;
	let bob_rgb_addr = ensure_rgb_wallet_ready(&state.http, &bob, 40, 500).await?;
	stage_logs.push(format!("Alex RGB address: {alex_rgb_addr}"));
	stage_logs.push(format!("Bob RGB address: {bob_rgb_addr}"));

	for addr in [&alex_wallet_addr, &bob_wallet_addr, &alex_rgb_addr, &bob_rgb_addr] {
		bitcoin_cli(&["sendtoaddress", addr, "1.0"])?;
	}
	stage_logs.push("Funded wallet/rgb addresses with 1 BTC each (4 tx total).".to_string());

	let mine_addr = bitcoin_cli(&["getnewaddress"])?;
	bitcoin_cli(&["generatetoaddress", "6", &mine_addr])?;

	let height_out = bitcoin_cli(&["getblockcount"])?;
	let chain_height = height_out
		.parse::<u64>()
		.map_err(|_| CommandError::ExternalCommandFailed {
			command: "bitcoin-cli getblockcount".to_string(),
			message: Some(format!("unexpected getblockcount response: {height_out}")),
			hint: None,
		})?;
	stage_logs.push("Mined 6 blocks after funding.".to_string());

	// Alex bootstrap RGB asset: wallet sync -> rgb sync -> import issuer -> issue contract.
	rgbldkd_http::wallet_sync(&state.http, &alex).await?;
	stage_logs.push("Synced Alex wallet.".to_string());
	rgbldkd_http::rgb_sync(&state.http, &alex).await?;
	stage_logs.push("Synced Alex RGB state.".to_string());
	let alex_issue_rgb_addr = ensure_rgb_wallet_ready(&state.http, &alex, 20, 300).await?;
	stage_logs.push("Verified Alex RGB wallet is ready.".to_string());
	let issue_fund_txid = bitcoin_cli(&["sendtoaddress", &alex_issue_rgb_addr, "1.0"])?;
	stage_logs.push(format!(
		"Funded Alex issuance RGB address with 1 BTC: {alex_issue_rgb_addr} (txid={issue_fund_txid})"
	));
	let issue_mine_addr = bitcoin_cli(&["getnewaddress"])?;
	bitcoin_cli(&["generatetoaddress", "3", &issue_mine_addr])?;
	stage_logs.push("Mined 3 blocks for Alex RGB issuance UTXO.".to_string());
	rgbldkd_http::wallet_sync(&state.http, &alex).await?;
	rgbldkd_http::rgb_sync(&state.http, &alex).await?;
	stage_logs.push("Re-synced Alex wallet/RGB state before issuance.".to_string());
	let mut issue_utxo = bitcoin_utxo_for_sent_address(&issue_fund_txid, &alex_issue_rgb_addr)?;
	stage_logs.push(format!("Selected Alex issue UTXO: {issue_utxo}"));

	import_rgb_issuer_raw(
		&state.http,
		&alex,
		DEFAULT_BOOTSTRAP_ISSUER_NAME,
		DEFAULT_BOOTSTRAP_ISSUER_RAW,
	)
	.await?;
	stage_logs.push(format!(
		"Imported RGB issuer for Alex: {}.",
		DEFAULT_BOOTSTRAP_ISSUER_NAME
	));

	let mut issue_resp_opt: Option<rgbldkd_http::RgbContractsIssueResponse> = None;
	let mut last_issue_err: Option<CommandError> = None;
	for attempt in 1..=3 {
		match rgbldkd_http::rgb_contract_issue(
			&state.http,
			&alex,
			rgbldkd_http::RgbContractsIssueRequest {
				issuer_name: DEFAULT_BOOTSTRAP_ISSUER_NAME.to_string(),
				contract_name: DEFAULT_BOOTSTRAP_CONTRACT_NAME.to_string(),
				ticker: Some(DEFAULT_BOOTSTRAP_TICKER.to_string()),
				precision: Some(0),
				issued_supply: DEFAULT_BOOTSTRAP_ISSUED_SUPPLY.to_string(),
				utxo: Some(issue_utxo.clone()),
			},
		)
		.await
		{
			Ok(resp) => {
				issue_resp_opt = Some(resp);
				break;
			}
			Err(err) => {
				let retryable = err
					.to_string()
					.to_ascii_lowercase()
					.contains("no rgb wallet utxos available");
				if !retryable || attempt == 3 {
					last_issue_err = Some(err);
					break;
				}

				stage_logs.push(format!(
					"Issue attempt {attempt} failed (no rgb wallet utxos available); funding another RGB UTXO and retrying."
				));
				let retry_rgb_addr = ensure_rgb_wallet_ready(&state.http, &alex, 20, 300).await?;
				let retry_fund_txid = bitcoin_cli(&["sendtoaddress", &retry_rgb_addr, "1.0"])?;
				let retry_mine_addr = bitcoin_cli(&["getnewaddress"])?;
				bitcoin_cli(&["generatetoaddress", "3", &retry_mine_addr])?;
				rgbldkd_http::wallet_sync(&state.http, &alex).await?;
				rgbldkd_http::rgb_sync(&state.http, &alex).await?;
				issue_utxo = bitcoin_utxo_for_sent_address(&retry_fund_txid, &retry_rgb_addr)?;
				stage_logs.push(format!("Retry issue UTXO selected: {issue_utxo}"));
			}
		}
	}
	let issue_resp = issue_resp_opt.ok_or_else(|| last_issue_err.unwrap_or(CommandError::HttpRequestFailed))?;
	stage_logs.push(format!(
		"Issued Alex RGB asset: contract_id={}, asset_id={}, supply={}.",
		issue_resp.contract_id, issue_resp.asset_id, issue_resp.issued_supply
	));
	rgbldkd_http::rgb_sync(&state.http, &alex).await?;
	stage_logs.push("Synced Alex RGB state after issuance.".to_string());

	// Export Alex bootstrap contract and import into Bob so RGB channels can be opened immediately.
	let export_resp = rgbldkd_http::rgb_contract_export(
		&state.http,
		&alex,
		rgbldkd_http::RgbContractsExportRequest {
			contract_id: issue_resp.contract_id.clone(),
		},
	)
	.await?;
	stage_logs.push(format!(
		"Exported Alex RGB contract bundle: contract_id={}, consignment_key={}.",
		export_resp.contract_id, export_resp.consignment_key
	));
	let archive = rgbldkd_http::rgb_consignment_download(
		&state.http,
		&alex,
		&export_resp.consignment_key,
		"raw",
	)
	.await?;
	stage_logs.push(format!(
		"Downloaded Alex contract consignment archive ({} bytes).",
		archive.len()
	));
	let import_resp = rgbldkd_http::rgb_contract_import(
		&state.http,
		&bob,
		&issue_resp.contract_id,
		"raw",
		&archive,
	)
	.await?;
	stage_logs.push(format!(
		"Imported Alex RGB asset into Bob: contract_id={}, consignment_key={}.",
		import_resp.contract_id, import_resp.consignment_key
	));
	rgbldkd_http::rgb_sync(&state.http, &bob).await?;
	stage_logs.push("Synced Bob RGB state after contract import.".to_string());

	Ok(BootstrapLocalEnvironmentResponse {
		compose_file: generated_compose.to_string_lossy().to_string(),
		services,
		container_status,
		stage_logs,
		created_nodes: vec![
			BootstrapLocalEnvironmentNode {
				node_id: "alex".to_string(),
				display_name: "Alex".to_string(),
				main_api_base_url: alex.main_api_base_url,
				control_api_base_url: alex.control_api_base_url.unwrap_or_default(),
				wallet_address: alex_wallet_addr,
				funded_btc: 1.0,
			},
			BootstrapLocalEnvironmentNode {
				node_id: "bob".to_string(),
				display_name: "Bob".to_string(),
				main_api_base_url: bob.main_api_base_url,
				control_api_base_url: bob.control_api_base_url.unwrap_or_default(),
				wallet_address: bob_wallet_addr,
				funded_btc: 1.0,
			},
		],
		mined_blocks: 6,
		mined_to_address: mine_addr,
		chain_height,
	})
}


#[tauri::command]
pub async fn bootstrap_local_node(
	state: State<'_, AppState>,
	node_name: Option<String>,
	container_name: Option<String>,
	main_api_port: Option<u16>,
	control_api_port: Option<u16>,
	p2p_port: Option<u16>,
	network: Option<String>,
	esplora_url: Option<String>,
) -> Result<BootstrapLocalNodeResponse, CommandError> {
	let env = docker_environment().await?;
	if !env.installed {
		return Err(CommandError::ExternalCommandFailed {
			command: "docker".to_string(),
			message: Some("docker is not installed".to_string()),
			hint: Some("Install Docker Desktop/Engine and retry.".to_string()),
		});
	}
	if !env.daemon_running {
		return Err(CommandError::ExternalCommandFailed {
			command: "docker info".to_string(),
			message: Some("docker daemon is not running".to_string()),
			hint: Some("Start Docker Desktop/daemon and retry.".to_string()),
		});
	}

	// Resolve network and esplora URL.
	// Frontend passes the network name (mainnet/testnet/testnet4/regtest) and the
	// corresponding esplora API URL it read from VITE_* env vars.
	let resolved_network = network
		.as_deref()
		.map(str::trim)
		.filter(|s| !s.is_empty())
		.unwrap_or("regtest")
		.to_string();
	// Validate network value to prevent command injection.
	let resolved_network = match resolved_network.as_str() {
		"mainnet" | "testnet" | "testnet4" | "regtest" => resolved_network,
		other => return Err(CommandError::BadRequest {
			service: "control-panel",
			message: Some(format!("unsupported network: {other}")),
			hint: Some("Allowed values: mainnet, testnet, testnet4, regtest.".to_string()),
		}),
	};
	let resolved_esplora_url = esplora_url
		.as_deref()
		.map(str::trim)
		.filter(|s| !s.is_empty())
		.map(ToOwned::to_owned)
		.or_else(|| std::env::var("ESPLORA_URL").ok())
		.unwrap_or_else(|| "https://btc-regtest-cat.bitlightdev.info".to_string());

	let contexts = state.store.list().await;
	let used_main_ports: HashSet<u16> = contexts
		.iter()
		.filter_map(|c| extract_port_from_url(&c.main_api_base_url))
		.collect();
	let used_control_ports: HashSet<u16> = contexts
		.iter()
		.filter_map(|c| c.control_api_base_url.as_deref())
		.filter_map(extract_port_from_url)
		.collect();
	let used_p2p_ports: HashSet<u16> = contexts
		.iter()
		.filter_map(|c| c.p2p_listen.as_deref())
		.filter_map(|s| s.rsplit_once(':').and_then(|(_, p)| p.parse::<u16>().ok()))
		.collect();

	let resolved_main_port = match main_api_port {
		Some(p) => p,
		None => next_free_port(&used_main_ports, 8501).ok_or(CommandError::BadRequest {
			service: "control-panel",
			message: Some("unable to allocate main api port".to_string()),
			hint: Some("Provide mainApiPort explicitly.".to_string()),
		})?,
	};
	let resolved_control_port = match control_api_port {
		Some(p) => p,
		None => next_free_port(&used_control_ports, 8551).ok_or(CommandError::BadRequest {
			service: "control-panel",
			message: Some("unable to allocate control api port".to_string()),
			hint: Some("Provide controlApiPort explicitly.".to_string()),
		})?,
	};
	let resolved_p2p_port = match p2p_port {
		Some(p) => p,
		None => next_free_port(&used_p2p_ports, 9735).ok_or(CommandError::BadRequest {
			service: "control-panel",
			message: Some("unable to allocate p2p port".to_string()),
			hint: Some("Provide p2pPort explicitly.".to_string()),
		})?,
	};

	if used_main_ports.contains(&resolved_main_port) {
		return Err(CommandError::BadRequest {
			service: "control-panel",
			message: Some(format!("main api port already used: {resolved_main_port}")),
			hint: Some("Choose a different mainApiPort.".to_string()),
		});
	}
	if used_control_ports.contains(&resolved_control_port) {
		return Err(CommandError::BadRequest {
			service: "control-panel",
			message: Some(format!("control api port already used: {resolved_control_port}")),
			hint: Some("Choose a different controlApiPort.".to_string()),
		});
	}
	if used_p2p_ports.contains(&resolved_p2p_port) {
		return Err(CommandError::BadRequest {
			service: "control-panel",
			message: Some(format!("p2p port already used: {resolved_p2p_port}")),
			hint: Some("Choose a different p2pPort.".to_string()),
		});
	}

	// Each node gets a random suffix so multiple nodes can coexist without
	// colliding on data directories or container names.
	let suffix = random_suffix();

	let default_name = format!("Node {suffix}");
	let display_name = node_name
		.as_deref()
		.map(str::trim)
		.filter(|s| !s.is_empty())
		.unwrap_or(&default_name)
		.to_string();

	let default_container = format!("rgb-node-{resolved_network}-{resolved_main_port}-{suffix}");
	let container_name = container_name
		.as_deref()
		.map(str::trim)
		.filter(|s| !s.is_empty())
		.unwrap_or(&default_container)
		.to_string();
	let slug = sanitize_slug(&container_name);
	if slug.is_empty() {
		return Err(CommandError::BadRequest {
			service: "control-panel",
			message: Some("container name is invalid".to_string()),
			hint: Some("Use letters, digits, '-' or '_'.".to_string()),
		});
	}

	// Include the random suffix in the data path so each node has its own
	// isolated directory even when the same node_name is used multiple times.
	let dir_key = format!("{slug}-{suffix}");
	let data_root = app_dirs::data_dir()?.join("local-nodes").join(&dir_key);
	let secrets_dir = data_root.join("secrets");
	let http_token = secrets_dir.join("http.token");
	let control_http_token = secrets_dir.join("control-http.token");
	let keystore_passphrase = secrets_dir.join("keystore.passphrase");
	let data_volume_name = format!("rgbldk_node_data_{}", dir_key.replace('-', "_"));

	ensure_secret_file(&http_token, 16)?;
	ensure_secret_file(&control_http_token, 16)?;
	ensure_secret_file(&keystore_passphrase, 16)?;

	let exists = run_command_status(
		"docker",
		&["inspect".to_string(), container_name.clone()],
	)
	.is_ok();

	let image = std::env::var("RGB_LDK_NODE_IMAGE")
		.unwrap_or_else(|_| "bitlightlabs/rln-ldk-node:main".to_string());

	if exists {
		let _ = run_command_status(
			"docker",
			&["start".to_string(), container_name.clone()],
		);
	} else {
		let run_args = vec![
			"run".to_string(),
			"-d".to_string(),
			"--name".to_string(),
			container_name.clone(),
			"--restart".to_string(),
			"unless-stopped".to_string(),
			"--add-host".to_string(),
			"host.docker.internal:host-gateway".to_string(),
			"-p".to_string(),
			format!("127.0.0.1:{resolved_main_port}:8500"),
			"-p".to_string(),
			format!("127.0.0.1:{resolved_control_port}:8550"),
			"-p".to_string(),
			format!("127.0.0.1:{resolved_p2p_port}:9735"),
			"-v".to_string(),
			format!("{data_volume_name}:/home/rgbldk/.ldk-node"),
			"--mount".to_string(),
			format!(
				"type=bind,src={},dst=/run/secrets/rgbldk_http_token,readonly",
				http_token.display()
			),
			"--mount".to_string(),
			format!(
				"type=bind,src={},dst=/run/secrets/rgbldk_control_http_token,readonly",
				control_http_token.display()
			),
			"--mount".to_string(),
			format!(
				"type=bind,src={},dst=/run/secrets/rgbldk_keystore_passphrase,readonly",
				keystore_passphrase.display()
			),
			image,
			"rgbldkd".to_string(),
			"server".to_string(),
			"--listen".to_string(),
			"0.0.0.0:8500".to_string(),
			"--allow-non-loopback-listen".to_string(),
			"--http-token-file".to_string(),
			"/run/secrets/rgbldk_http_token".to_string(),
			"--control-http-listen".to_string(),
			"0.0.0.0:8550".to_string(),
			"--control-http-allow-non-loopback".to_string(),
			"--control-http-token-file".to_string(),
			"/run/secrets/rgbldk_control_http_token".to_string(),
			"--control-http-allow-unlock".to_string(),
			"--control-http-allow-lock".to_string(),
			"--data-dir".to_string(),
			"/home/rgbldk/.ldk-node".to_string(),
			"--keystore-passphrase-file".to_string(),
			"/run/secrets/rgbldk_keystore_passphrase".to_string(),
			"--auto-init-keystore".to_string(),
			"--network".to_string(),
			resolved_network.clone(),
			"--esplora-url".to_string(),
			resolved_esplora_url,
			"--ldk-listen".to_string(),
			"0.0.0.0:9735".to_string(),
			"--node-alias".to_string(),
			slug.clone(),
			"--rgb-enabled".to_string(),
			"--log-to-stdout".to_string(),
			"--log-level".to_string(),
			"trace".to_string(),
		];
		run_command_status("docker", &run_args).map_err(|e| CommandError::ExternalCommandFailed {
			command: "docker run".to_string(),
			message: Some(e),
			hint: Some(format!(
				"Check Docker permissions and port conflicts on {resolved_main_port}/{resolved_control_port}/{resolved_p2p_port}."
			)),
		})?;
	}

	let node_id = format!("node-{resolved_network}-{resolved_main_port}-{suffix}");
	let main_api_base_url = format!("http://127.0.0.1:{resolved_main_port}/");
	let control_api_base_url = format!("http://127.0.0.1:{resolved_control_port}/");
	let p2p_listen = format!("host.docker.internal:{resolved_p2p_port}");
	let rgb_consignment_base_url =
		derive_consignment_template_from_main_api(&main_api_base_url, Some(&p2p_listen));

	let context = NodeContext {
		node_id: node_id.clone(),
		display_name: display_name.clone(),
		main_api_base_url: main_api_base_url.clone(),
		main_api_token_file_path: Some(http_token.display().to_string()),
		control_api_base_url: Some(control_api_base_url.clone()),
		control_api_token_file_path: Some(control_http_token.display().to_string()),
		data_dir: Some(format!("docker-volume:{data_volume_name}")),
		p2p_listen: Some(p2p_listen),
		rgb_consignment_base_url,
		allow_non_loopback: false,
		network: resolved_network,
	};

	let mut reachable = false;
	for _ in 0..30 {
		match rgbldkd_http::main_status(&state.http, &context).await {
			Ok(_) => {
				reachable = true;
				break;
			}
			Err(_) => tokio::time::sleep(Duration::from_secs(1)).await,
		}
	}
	if !reachable {
		return Err(CommandError::ExternalCommandFailed {
			command: "docker run/start".to_string(),
			message: Some("node main API is not reachable after startup".to_string()),
			hint: Some("Check `docker logs <container>` for startup errors (tokens/passphrase/esplora/ports).".to_string()),
		});
	}

	state.store.upsert(context.clone()).await?;

	// The container may need a few seconds before control API is reachable.
	for _ in 0..30 {
		match rgbldkd_http::control_unlock(&state.http, &context).await {
			Ok(_) => break,
			Err(_) => tokio::time::sleep(Duration::from_secs(1)).await,
		}
	}

	Ok(BootstrapLocalNodeResponse {
		node_id,
		display_name,
		container_name,
		main_api_base_url,
		control_api_base_url,
		main_api_port: resolved_main_port,
		control_api_port: resolved_control_port,
		p2p_port: resolved_p2p_port,
		created: !exists,
	})
}

#[tauri::command]
pub async fn node_main_http(
	state: State<'_, AppState>,
	node_id: String,
	method: String,
	path: String,
	headers: Option<HashMap<String, String>>,
	body_text: Option<String>,
) -> Result<NodeHttpProxyResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;

	let method = method.trim().to_ascii_uppercase();
	let method = match method.as_str() {
		"GET" => reqwest::Method::GET,
		"POST" => reqwest::Method::POST,
		"PUT" => reqwest::Method::PUT,
		"DELETE" => reqwest::Method::DELETE,
		"PATCH" => reqwest::Method::PATCH,
		_ => {
			return Err(CommandError::BadRequest {
				service: "control-panel",
				message: Some(format!("unsupported method: {method}")),
				hint: Some("Allowed: GET|POST|PUT|DELETE|PATCH".to_string()),
			});
		}
	};

	let path = path.trim();
	if !path.starts_with('/') || path.starts_with("//") || path.contains("://") {
		return Err(CommandError::BadRequest {
			service: "control-panel",
			message: Some("invalid path".to_string()),
			hint: Some("Expected a relative path like /status or /payments".to_string()),
		});
	}

	let base = reqwest::Url::parse(&ctx.main_api_base_url).map_err(|_| CommandError::InvalidBaseUrl {
		url: ctx.main_api_base_url.clone(),
	})?;
	let api_base = base.join("api/v1/").map_err(|_| CommandError::InvalidBaseUrl {
		url: ctx.main_api_base_url.clone(),
	})?;
	let rel = path.trim_start_matches('/');
	let url = api_base.join(rel).map_err(|_| CommandError::InvalidBaseUrl {
		url: ctx.main_api_base_url.clone(),
	})?;
	let method_name = method.as_str().to_string();

	let mut req = state.http.request(method, url);

	// Allow a tiny safe header allowlist (never allow Authorization from UI).
	if let Some(h) = headers {
		for (k, v) in h {
			let key = k.trim();
			if key.eq_ignore_ascii_case("authorization") {
				continue;
			}
			if key.eq_ignore_ascii_case("content-type") || key.eq_ignore_ascii_case("accept") {
				if let Ok(hv) = reqwest::header::HeaderValue::from_str(v.trim()) {
					req = req.header(key, hv);
				}
			}
		}
	}

	if let Some(path) = ctx.main_api_token_file_path.as_deref() {
		let token = read_token_file(std::path::Path::new(path))?;
		req = req.bearer_auth(token);
	}

	if let Some(body) = body_text {
		req = req.body(body);
	}

	push_http_event(
		&state,
		&node_id,
		"main.http_proxy",
		"request",
		None,
		Some(serde_json::json!({
			"method": method_name,
			"path": path,
		})),
		None,
		None,
	)
	.await;

	let started = now_ms();
	let resp = match req.send().await {
		Ok(v) => v,
		Err(_) => {
			let err = CommandError::HttpRequestFailed;
			push_http_event(
				&state,
				&node_id,
				"main.http_proxy",
				"error",
				Some(now_ms().saturating_sub(started)),
				None,
				None,
				serde_json::to_value(&err).ok(),
			)
			.await;
			return Err(err);
		}
	};
	let status = resp.status().as_u16();
	let ok = resp.status().is_success();
	let body = resp.text().await.unwrap_or_default();

	push_http_event(
		&state,
		&node_id,
		"main.http_proxy",
		"response",
		Some(now_ms().saturating_sub(started)),
		None,
		Some(compact_response_value(serde_json::json!({
			"status": status,
			"ok": ok,
			"body": body,
		}))),
		None,
	)
	.await;

	Ok(NodeHttpProxyResponse { status, ok, body })
}

#[tauri::command]
pub async fn node_main_status(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<MainStatusResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"main.status",
		None,
		rgbldkd_http::main_status(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_main_version(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<rgbldkd_http::VersionResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"main.version",
		None,
		rgbldkd_http::main_version(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_main_node_id(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<rgbldkd_http::NodeIdResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"main.node_id",
		None,
		rgbldkd_http::main_node_id(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_main_listening_addresses(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<rgbldkd_http::ListeningAddressesResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"main.listening_addresses",
		None,
		rgbldkd_http::main_listening_addresses(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_main_peers(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<Vec<rgbldkd_http::PeerDetailsDto>, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"main.peers",
		None,
		rgbldkd_http::main_peers(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_main_peers_connect(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::PeerConnectRequest,
) -> Result<OkResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.peers_connect",
		request_json,
		rgbldkd_http::main_peers_connect(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_main_peers_disconnect(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::PeerDisconnectRequest,
) -> Result<OkResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.peers_disconnect",
		request_json,
		rgbldkd_http::main_peers_disconnect(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_main_balances(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<rgbldkd_http::BalancesDto, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"main.balances",
		None,
		rgbldkd_http::main_balances(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_wallet_new_address(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<rgbldkd_http::WalletNewAddressResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"wallet.new_address",
		None,
		rgbldkd_http::wallet_new_address(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_wallet_sync(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<OkResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"wallet.sync",
		None,
		rgbldkd_http::wallet_sync(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_rgb_sync(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<OkResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"rgb.sync",
		None,
		rgbldkd_http::rgb_sync(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_rgb_contracts(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<rgbldkd_http::RgbContractsResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"rgb.contracts",
		None,
		rgbldkd_http::rgb_contracts(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_rgb_contract_issue(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::RgbContractsIssueRequest,
) -> Result<rgbldkd_http::RgbContractsIssueResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"rgb.contract_issue",
		request_json,
		rgbldkd_http::rgb_contract_issue(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_rgb_contract_export_bundle(
	state: State<'_, AppState>,
	node_id: String,
	contract_id: String,
	format: Option<String>,
) -> Result<rgbldkd_http::RgbContractsExportBundle, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let fmt = format.unwrap_or_else(|| "raw".to_string());
	let export = traced_node_call(
		&state,
		&node_id,
		"rgb.contract_export",
		Some(serde_json::json!({ "contract_id": contract_id })),
		rgbldkd_http::rgb_contract_export(
			&state.http,
			&ctx,
			rgbldkd_http::RgbContractsExportRequest { contract_id: contract_id.clone() },
		),
	)
	.await?;
	let bytes = traced_node_call(
		&state,
		&node_id,
		"rgb.consignment_download",
		Some(serde_json::json!({
			"consignment_key": export.consignment_key,
			"format": fmt,
		})),
		rgbldkd_http::rgb_consignment_download(&state.http, &ctx, &export.consignment_key, &fmt),
	)
	.await?;
	let archive_base64 = general_purpose::STANDARD.encode(bytes);
	Ok(rgbldkd_http::RgbContractsExportBundle {
		contract_id: export.contract_id,
		consignment_key: export.consignment_key,
		archive_base64,
		format: fmt,
	})
}

#[tauri::command]
pub async fn node_rgb_contract_import_bundle(
	state: State<'_, AppState>,
	node_id: String,
	contract_id: String,
	format: Option<String>,
	archive_base64: String,
) -> Result<rgbldkd_http::RgbContractsImportResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let fmt = format.unwrap_or_else(|| "raw".to_string());
	let bytes = general_purpose::STANDARD
		.decode(archive_base64.as_bytes())
		.map_err(|_| CommandError::BadRequest {
			service: "main",
			message: Some("invalid base64 archive".to_string()),
			hint: None,
		})?;
	traced_node_call(
		&state,
		&node_id,
		"rgb.contract_import",
		Some(serde_json::json!({
			"contract_id": contract_id,
			"format": fmt,
			"archive_size": bytes.len(),
		})),
		rgbldkd_http::rgb_contract_import(&state.http, &ctx, &contract_id, &fmt, &bytes),
	)
	.await
}

#[tauri::command]
pub async fn node_rgb_contract_balance(
	state: State<'_, AppState>,
	node_id: String,
	contract_id: String,
) -> Result<rgbldkd_http::RgbContractBalanceResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"rgb.contract_balance",
		Some(serde_json::json!({ "contract_id": contract_id })),
		rgbldkd_http::rgb_contract_balance(&state.http, &ctx, &contract_id),
	)
	.await
}

#[tauri::command]
pub async fn node_rgb_ln_invoice_create(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::RgbLnInvoiceCreateRequest,
) -> Result<rgbldkd_http::RgbLnInvoiceResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"rgb.ln_invoice_create",
		request_json,
		rgbldkd_http::rgb_ln_invoice_create(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_rgb_ln_pay(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::RgbLnPayRequest,
) -> Result<rgbldkd_http::SendResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"rgb.ln_pay",
		request_json,
		rgbldkd_http::rgb_ln_pay(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_main_channels(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<Vec<rgbldkd_http::ChannelDetailsExtendedDto>, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"main.channels",
		None,
		rgbldkd_http::main_channels(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_channel_open(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::OpenChannelRequest,
) -> Result<rgbldkd_http::OpenChannelResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.channel_open",
		request_json,
		rgbldkd_http::channel_open(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_bolt11_receive(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::Bolt11ReceiveRequest,
) -> Result<rgbldkd_http::Bolt11ReceiveResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.bolt11_receive",
		request_json,
		rgbldkd_http::bolt11_receive(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_bolt11_receive_var(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::Bolt11ReceiveVarRequest,
) -> Result<rgbldkd_http::Bolt11ReceiveResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.bolt11_receive_var",
		request_json,
		rgbldkd_http::bolt11_receive_var(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_bolt11_decode(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::Bolt11DecodeRequest,
) -> Result<rgbldkd_http::Bolt11DecodeResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.bolt11_decode",
		request_json,
		rgbldkd_http::bolt11_decode(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_bolt11_send(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::Bolt11SendRequest,
) -> Result<rgbldkd_http::SendResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.bolt11_send",
		request_json,
		rgbldkd_http::bolt11_send(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_bolt11_send_using_amount(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::Bolt11SendUsingAmountRequest,
) -> Result<rgbldkd_http::SendResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.bolt11_send_using_amount",
		request_json,
		rgbldkd_http::bolt11_send_using_amount(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_bolt11_pay(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::Bolt11PayRequest,
) -> Result<rgbldkd_http::Bolt11PayResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.bolt11_pay",
		request_json,
		rgbldkd_http::bolt11_pay(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_bolt12_offer_receive(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::Bolt12OfferReceiveRequest,
) -> Result<rgbldkd_http::Bolt12OfferResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.bolt12_offer_receive",
		request_json,
		rgbldkd_http::bolt12_offer_receive(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_bolt12_offer_receive_var(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::Bolt12OfferReceiveVarRequest,
) -> Result<rgbldkd_http::Bolt12OfferResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.bolt12_offer_receive_var",
		request_json,
		rgbldkd_http::bolt12_offer_receive_var(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_bolt12_offer_decode(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::Bolt12OfferDecodeRequest,
) -> Result<rgbldkd_http::Bolt12OfferDecodeResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.bolt12_offer_decode",
		request_json,
		rgbldkd_http::bolt12_offer_decode(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_bolt12_offer_send(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::Bolt12OfferSendRequest,
) -> Result<rgbldkd_http::SendResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.bolt12_offer_send",
		request_json,
		rgbldkd_http::bolt12_offer_send(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_bolt12_refund_initiate(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::Bolt12RefundInitiateRequest,
) -> Result<rgbldkd_http::Bolt12RefundInitiateResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.bolt12_refund_initiate",
		request_json,
		rgbldkd_http::bolt12_refund_initiate(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_bolt12_refund_decode(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::Bolt12RefundDecodeRequest,
) -> Result<rgbldkd_http::Bolt12RefundDecodeResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.bolt12_refund_decode",
		request_json,
		rgbldkd_http::bolt12_refund_decode(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_bolt12_refund_request_payment(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::Bolt12RefundRequestPaymentRequest,
) -> Result<rgbldkd_http::Bolt12RefundRequestPaymentResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.bolt12_refund_request_payment",
		request_json,
		rgbldkd_http::bolt12_refund_request_payment(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_payments_list(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<Vec<rgbldkd_http::PaymentDetailsDto>, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"main.payments_list",
		None,
		rgbldkd_http::payments_list(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_payment_get(
	state: State<'_, AppState>,
	node_id: String,
	payment_id: String,
) -> Result<rgbldkd_http::PaymentDetailsDto, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"main.payment_get",
		Some(serde_json::json!({ "payment_id": payment_id })),
		rgbldkd_http::payment_get(&state.http, &ctx, &payment_id),
	)
	.await
}

#[tauri::command]
pub async fn node_payment_wait(
	state: State<'_, AppState>,
	node_id: String,
	payment_id: String,
	request: rgbldkd_http::PaymentWaitRequest,
) -> Result<rgbldkd_http::PaymentWaitResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"main.payment_wait",
		Some(serde_json::json!({ "payment_id": payment_id, "request": request })),
		rgbldkd_http::payment_wait(&state.http, &ctx, &payment_id, request),
	)
	.await
}

#[tauri::command]
pub async fn node_payment_abandon(
	state: State<'_, AppState>,
	node_id: String,
	payment_id: String,
) -> Result<OkResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"main.payment_abandon",
		Some(serde_json::json!({ "payment_id": payment_id })),
		rgbldkd_http::payment_abandon(&state.http, &ctx, &payment_id),
	)
	.await
}

#[tauri::command]
pub async fn node_channel_close(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::CloseChannelRequest,
) -> Result<OkResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.channel_close",
		request_json,
		rgbldkd_http::channel_close(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_channel_force_close(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::CloseChannelRequest,
) -> Result<OkResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"main.channel_force_close",
		request_json,
		rgbldkd_http::channel_force_close(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_main_healthz(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<OkResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"main.healthz",
		None,
		rgbldkd_http::main_healthz(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_main_readyz(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<OkResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"main.readyz",
		None,
		rgbldkd_http::main_readyz(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_control_status(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<ControlStatusDto, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"control.status",
		None,
		rgbldkd_http::control_status(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_unlock(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<ControlStatusDto, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"control.unlock",
		None,
		rgbldkd_http::control_unlock(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_lock(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<ControlStatusDto, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"control.lock",
		None,
		rgbldkd_http::control_lock(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn plugin_wallet_asset_export(
    _state: State<'_, AppState>,
    contract_id: String,
		url: String,
) -> Result<rgbldkd_http::RgbContractsExportBundle, CommandError> {
    let bytes = wallet::plugin_wallet_asset_export(&contract_id, &url).await?;

    let archive_base64 = general_purpose::STANDARD.encode(bytes);
    Ok(rgbldkd_http::RgbContractsExportBundle {
        contract_id: contract_id.clone(),
        consignment_key: "".to_string(),
        archive_base64,
        format: "raw".to_string(),
    })
}

#[tauri::command]
pub async fn plugin_wallet_transfer_consignment_export(
    _state: State<'_, AppState>,
    payment_id: String,
) -> Result<rgbldkd_http::RgbContractsExportBundle, CommandError> {
    let bytes = wallet::plugin_wallet_transfer_consignment_export(&payment_id).await?;

    let archive_base64 = general_purpose::STANDARD.encode(bytes);
    Ok(rgbldkd_http::RgbContractsExportBundle {
        contract_id: "".to_string(),
        consignment_key: "".to_string(),
        archive_base64,
        format: "raw".to_string(),
    })
}

#[tauri::command]
pub async fn download_transfer_consignment_from_link(
    _state: State<'_, AppState>,
    link: String,
) -> Result<rgbldkd_http::TransferConsignment, CommandError> {
    let bytes = wallet::download_transfer_consignment_from_link(&link).await?;

    let archive_base64 = general_purpose::STANDARD.encode(bytes);
    Ok(rgbldkd_http::TransferConsignment {
        archive_base64,
        format: "raw".to_string(),
    })
}


#[tauri::command]
pub async fn node_rgb_utxos_summary(
    state: State<'_, AppState>,
    node_id: String,
) -> Result<rgbldkd_http::RgbUtxosSummaryResponse, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"rgb.utxos_summary",
		None,
		rgbldkd_http::rgb_utxos_summary(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_rgb_onchain_invoice_create(
    state: State<'_, AppState>,
    node_id: String,
    request: rgbldkd_http::RgbOnchainInvoiceCreateRequest,
) -> Result<rgbldkd_http::RgbOnchainInvoiceResponse, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"rgb.onchain_invoice_create",
		request_json,
		rgbldkd_http::rgb_onchain_invoice_create(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn node_rgb_new_address(
    state: State<'_, AppState>,
    node_id: String,
) -> Result<rgbldkd_http::WalletNewAddressResponse, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"rgb.new_address",
		None,
		rgbldkd_http::rgb_new_address(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_rgb_onchain_transfer_consignment_accept(
    state: State<'_, AppState>,
    node_id: String,
    format: Option<String>,
		invoice: String,
    transfer_consignment_base64: String,
) -> Result<rgbldkd_http::RgbOnchainReceiveResponse, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    let fmt = format.unwrap_or_else(|| "raw".to_string());
		let mut hasher = Sha256::new();
    hasher.update(invoice.as_bytes());
    let payment_id = hasher.finalize();
		let payment_id_hex = hex::encode(payment_id);

    let bytes = general_purpose::STANDARD
        .decode(transfer_consignment_base64.as_bytes())
        .map_err(|_| CommandError::BadRequest {
            service: "main",
            message: Some("invalid base64 consignment".to_string()),
            hint: None,
        })?;

	traced_node_call(
		&state,
		&node_id,
		"rgb.onchain_receive_archive",
		Some(serde_json::json!({
			"format": fmt,
			"payment_id": payment_id_hex,
			"archive_size": bytes.len(),
		})),
		rgbldkd_http::rgb_onchain_receive_archive(&state.http, &ctx, &fmt, &payment_id_hex, &bytes),
	)
	.await
}

#[tauri::command]
pub async fn node_rgb_contract_issuers_import(
    state: State<'_, AppState>,
    node_id: String,
    name: String,
    format: Option<String>,
    archive_base64: String,
) -> Result<rgbldkd_http::RgbIssuersImportResponse, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    let fmt = format.unwrap_or_else(|| "raw".to_string());
    let bytes = general_purpose::STANDARD
        .decode(archive_base64.as_bytes())
        .map_err(|_| CommandError::BadRequest {
            service: "main",
            message: Some("invalid base64 archive".to_string()),
            hint: None,
        })?;
	traced_node_call(
		&state,
		&node_id,
		"rgb.issuers_import",
		Some(serde_json::json!({
			"name": name,
			"format": fmt,
			"archive_size": bytes.len(),
		})),
		rgbldkd_http::rgb_issuers_import(&state.http, &ctx, &name, &fmt, &bytes),
	)
	.await
}

#[tauri::command]
pub async fn node_rgb_issuers(
    state: State<'_, AppState>,
    node_id: String,
) -> Result<rgbldkd_http::RgbIssuersResponse, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"rgb.issuers",
		None,
		rgbldkd_http::rgb_issuers(&state.http, &ctx),
	)
	.await
}

#[tauri::command]
pub async fn node_rgb_onchain_transfer_consignment_download(
    state: State<'_, AppState>,
    node_id: String,
    consignment_key: String,
    format: Option<String>,
) -> Result<rgbldkd_http::RgbOnchainTransferConsignment, CommandError> {
    let sender_ctx = get_ctx(&state.store, &node_id).await?;
    let fmt = format.unwrap_or_else(|| "raw".to_string());

	let bytes = traced_node_call(
		&state,
		&node_id,
		"rgb.consignment_download",
		Some(serde_json::json!({
			"consignment_key": consignment_key,
			"format": fmt,
		})),
		rgbldkd_http::rgb_consignment_download(
			&state.http,
			&sender_ctx,
			&consignment_key,
			&fmt,
		),
	)
	.await?;

    let archive_base64 = general_purpose::STANDARD.encode(bytes);
    Ok(rgbldkd_http::RgbOnchainTransferConsignment {
        archive_base64,
    })
}

#[tauri::command]
pub async fn node_rgb_onchain_send(
	state: State<'_, AppState>,
	node_id: String,
	request: rgbldkd_http::RgbOnchainSendRequest,
) -> Result<rgbldkd_http::RgbOnchainSendResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	let request_json = serde_json::to_value(&request).ok();
	traced_node_call(
		&state,
		&node_id,
		"rgb.onchain_send",
		request_json,
		rgbldkd_http::rgb_onchain_send(&state.http, &ctx, request),
	)
	.await
}

#[tauri::command]
pub async fn plugin_wallet_transfer_consignment_accept(
    _state: State<'_, AppState>,
    consignment_base64: String,
) -> Result<String, CommandError> {
		let bytes = general_purpose::STANDARD
		.decode(consignment_base64.as_bytes())
		.map_err(|_| CommandError::BadRequest {
			service: "main",
			message: Some("invalid base64 consignment".to_string()),
			hint: None,
		})?;

	wallet::plugin_wallet_transfer_consignment_accept(&bytes).await
}

#[tauri::command]
pub async fn rgb_onchain_payments(
	state: State<'_, AppState>,
	node_id: String,
) -> Result<rgbldkd_http::RgbOnchainPaymentsResponse, CommandError> {
	let ctx = get_ctx(&state.store, &node_id).await?;
	traced_node_call(
		&state,
		&node_id,
		"rgb.onchain_payments",
		None,
		rgbldkd_http::rgb_onchain_payments(&state.http, &ctx),
	)
	.await
}
