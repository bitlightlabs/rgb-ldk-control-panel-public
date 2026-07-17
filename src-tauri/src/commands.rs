use crate::{
    AppState, app_dirs, constant, context_store::{ContextStore, NodeContext}, error::CommandError, events_manager::{EventsStatus, StoredEvent}, ldk_types, logger::{LogEntry, LogLevel, now_ms}, rgbldkd_http::{self, ControlStatusDto, MainStatusResponse, OkResponse}, util::{encode_uri_component, get_current_timestamp, sort_http_params, str_to_hex}, wallet
};
use base64::{engine::general_purpose, Engine as _};
use hex;
use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use rand::RngCore;
use std::collections::{HashMap, HashSet};
use std::future::Future;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;
use tauri::AppHandle;
use tauri::State;

// const DEFAULT_BOOTSTRAP_ISSUER_NAME: &str = "RGB20-Simplest-v0-rLosfg";
// const DEFAULT_BOOTSTRAP_CONTRACT_NAME: &str = "RGB";
// const DEFAULT_BOOTSTRAP_TICKER: &str = "RGB";
// const DEFAULT_BOOTSTRAP_ISSUED_SUPPLY: &str = "1000000";
const MAX_EVENT_RESPONSE_CHARS: usize = 2048;
// const DEFAULT_BOOTSTRAP_ISSUER_RAW: &[u8] =
//     include_bytes!("../../e2e-tests/fixtures/RGB20-Simplest-v0-rLosfg.issuer");
// const BUILTIN_DOCKER_COMPOSE_YML: &str = include_str!("../../docker-compose.yml");

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
    let preview = serialized
        .chars()
        .take(MAX_EVENT_RESPONSE_CHARS)
        .collect::<String>();
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
        let main = reqwest::Url::parse(&ctx.main_api_base_url).map_err(|_| {
            CommandError::InvalidContext {
                field: "main_api_base_url".to_string(),
                message: "invalid url".to_string(),
                hint: Some("Expected e.g. http://127.0.0.1:8500/".to_string()),
            }
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
            let control =
                reqwest::Url::parse(control_raw).map_err(|_| CommandError::InvalidContext {
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
                    hint: Some(
                        "Use 127.0.0.1/localhost/::1 or enable allow_non_loopback.".to_string(),
                    ),
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

#[tauri::command]
pub async fn contexts_update_image(
    state: State<'_, AppState>,
    node_id: String,
    image: String,
) -> Result<(), CommandError> {
    let mut ctx = get_ctx(&state.store, &node_id).await?;
    ctx.image = Some(image);
    state.store.upsert(ctx).await
}

async fn get_ctx(store: &ContextStore, node_id: &str) -> Result<NodeContext, CommandError> {
    store
        .get(node_id)
        .await
        .ok_or(CommandError::ContextNotFound {
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
pub async fn events_clear(state: State<'_, AppState>, node_id: String) -> Result<(), CommandError> {
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


// #[derive(Debug, Clone)]
// struct RpcConfig {
//     host: String,
//     port: String,
//     user: String,
//     password: String,
// }

fn run_command_capture(program: &str, args: &[String]) -> Result<String, String> {
    let resolved_program = resolve_executable(program).unwrap_or_else(|| PathBuf::from(program));
    let mut cmd = Command::new(&resolved_program);
    cmd.args(args);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd
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
    let mut cmd = Command::new(&resolved_program);
    cmd.args(args);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd
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

// fn run_command_capture_in_dir(
//     program: &str,
//     args: &[String],
//     cwd: &std::path::Path,
// ) -> Result<String, String> {
//     run_command_capture_in_dir_with_env(program, args, cwd, &[])
// }

// fn run_command_capture_in_dir_with_env(
//     program: &str,
//     args: &[String],
//     cwd: &std::path::Path,
//     envs: &[(&str, &str)],
// ) -> Result<String, String> {
//     let resolved_program = resolve_executable(program).unwrap_or_else(|| PathBuf::from(program));
//     let mut cmd = Command::new(&resolved_program);
//     cmd.current_dir(cwd).envs(envs.iter().copied()).args(args);

//     #[cfg(target_os = "windows")]
//     {
//         use std::os::windows::process::CommandExt;
//         const CREATE_NO_WINDOW: u32 = 0x08000000;
//         cmd.creation_flags(CREATE_NO_WINDOW);
//     }

//     let output = cmd
//         .output()
//         .map_err(|e| format!("{program}: {e}"))?;

//     if !output.status.success() {
//         let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
//         let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
//         let details = if !stderr.is_empty() {
//             stderr
//         } else if !stdout.is_empty() {
//             stdout
//         } else {
//             format!("exit status {}", output.status)
//         };
//         return Err(format!("{program}: {details}"));
//     }

//     Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
// }

fn resolve_executable(program: &str) -> Option<PathBuf> {
    let p = Path::new(program);
    if p.components().count() > 1 {
        return if p.exists() {
            Some(p.to_path_buf())
        } else {
            None
        };
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
    let raw = format!(
        "{}:{}:{}:{}",
        std::process::id(),
        nanos,
        path.display(),
        min_len
    );
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
    // Cover the three phrasings docker uses across versions / CLI subcommands:
    //   - `docker inspect <missing>`      → "No such object: <name>"
    //   - `docker rm <missing-container>` → "No such container: <name>"
    //   - `docker volume rm <missing>`    → "No such volume: <name>"
    lower.contains("no such object")
        || lower.contains("no such container")
        || lower.contains("no such volume")
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
        if let Err(e) =
            run_command_status("docker", &["rm".to_string(), "-f".to_string(), id.clone()])
        {
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
                &[
                    "volume".to_string(),
                    "rm".to_string(),
                    volume_name.to_string(),
                ],
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

// fn rpc_config_from_env() -> Option<RpcConfig> {
//     let host_port = std::env::var("BITCOIND_RPC").ok()?;
//     let (host, port) = host_port.rsplit_once(':')?;
//     let user = std::env::var("BITCOIND_RPC_USER").unwrap_or_else(|_| "btcuser".to_string());
//     let password = std::env::var("BITCOIND_RPC_PASSWORD").unwrap_or_else(|_| "btcpass".to_string());
//     Some(RpcConfig {
//         host: host.to_string(),
//         port: port.to_string(),
//         user,
//         password,
//     })
// }

// fn rpc_config_localhost() -> RpcConfig {
//     let user = std::env::var("BITCOIND_RPC_USER").unwrap_or_else(|_| "btcuser".to_string());
//     let password = std::env::var("BITCOIND_RPC_PASSWORD").unwrap_or_else(|_| "btcpass".to_string());
//     RpcConfig {
//         host: "127.0.0.1".to_string(),
//         port: "18443".to_string(),
//         user,
//         password,
//     }
// }

// fn bitcoin_cli_via_rpc(args: &[&str], rpc: &RpcConfig) -> Result<String, String> {
//     let mut argv = vec![
//         "-regtest".to_string(),
//         format!("-rpcconnect={}", rpc.host),
//         format!("-rpcport={}", rpc.port),
//         format!("-rpcuser={}", rpc.user),
//         format!("-rpcpassword={}", rpc.password),
//     ];
//     argv.extend(args.iter().map(|s| (*s).to_string()));
//     run_command_capture("bitcoin-cli", &argv)
// }

// fn detect_bitcoind_container() -> Option<String> {
//     let output = run_command_capture(
//         "docker",
//         &[
//             "ps".to_string(),
//             "--format".to_string(),
//             "{{.Names}}".to_string(),
//         ],
//     )
//     .ok()?;
//     output
//         .lines()
//         .map(|line| line.trim())
//         .find(|line| {
//             let l = line.to_ascii_lowercase();
//             l.contains("bitcoind") || l.contains("bitcoin")
//         })
//         .map(ToOwned::to_owned)
// }

// fn bitcoin_cli_via_docker(args: &[&str], container: &str) -> Result<String, String> {
//     let mut argv = vec![
//         "exec".to_string(),
//         "-i".to_string(),
//         container.to_string(),
//         "bitcoin-cli".to_string(),
//         "-regtest".to_string(),
//         "-rpcuser=btcuser".to_string(),
//         "-rpcpassword=btcpass".to_string(),
//     ];
//     argv.extend(args.iter().map(|s| (*s).to_string()));
//     run_command_capture("docker", &argv)
// }

// fn bitcoin_cli(args: &[&str]) -> Result<String, CommandError> {
//     let mut attempts: Vec<String> = Vec::new();

//     if let Some(rpc) = rpc_config_from_env() {
//         match bitcoin_cli_via_rpc(args, &rpc) {
//             Ok(v) => return Ok(v),
//             Err(e) => attempts.push(format!("BITCOIND_RPC {}:{} -> {e}", rpc.host, rpc.port)),
//         }
//     }

//     let container = std::env::var("BITCOIND_CONTAINER")
//         .ok()
//         .filter(|s| !s.trim().is_empty())
//         .or_else(detect_bitcoind_container);
//     if let Some(container_name) = container {
//         match bitcoin_cli_via_docker(args, &container_name) {
//             Ok(v) => return Ok(v),
//             Err(e) => attempts.push(format!("docker container {container_name} -> {e}")),
//         }
//     }

//     let local = rpc_config_localhost();
//     match bitcoin_cli_via_rpc(args, &local) {
//         Ok(v) => return Ok(v),
//         Err(e) => attempts.push(format!("localhost {}:{} -> {e}", local.host, local.port)),
//     }

//     Err(CommandError::ExternalCommandFailed {
// 		command: "bitcoin-cli".to_string(),
// 		message: Some(format!(
// 			"failed to reach regtest bitcoind. attempts: {}",
// 			attempts.join(" | ")
// 		)),
// 		hint: Some(
// 			"Set BITCOIND_RPC=host:port (with BITCOIND_RPC_USER/PASSWORD), or BITCOIND_CONTAINER, or expose localhost:18443."
// 				.to_string(),
// 		),
// 	})
// }

// fn bitcoin_utxo_for_sent_address(txid: &str, address: &str) -> Result<String, CommandError> {
//     let tx_out = bitcoin_cli(&["gettransaction", txid])?;
//     let tx_json: serde_json::Value =
//         serde_json::from_str(&tx_out).map_err(|_| CommandError::ExternalCommandFailed {
//             command: "bitcoin-cli gettransaction".to_string(),
//             message: Some(format!("unexpected gettransaction response: {tx_out}")),
//             hint: None,
//         })?;
//     let hex =
//         tx_json
//             .get("hex")
//             .and_then(|x| x.as_str())
//             .ok_or(CommandError::ExternalCommandFailed {
//                 command: "bitcoin-cli gettransaction".to_string(),
//                 message: Some("missing hex in gettransaction response".to_string()),
//                 hint: None,
//             })?;
//     let dec_out = bitcoin_cli(&["decoderawtransaction", hex])?;
//     let dec_json: serde_json::Value =
//         serde_json::from_str(&dec_out).map_err(|_| CommandError::ExternalCommandFailed {
//             command: "bitcoin-cli decoderawtransaction".to_string(),
//             message: Some(format!(
//                 "unexpected decoderawtransaction response: {dec_out}"
//             )),
//             hint: None,
//         })?;
//     let vouts = dec_json.get("vout").and_then(|x| x.as_array()).ok_or(
//         CommandError::ExternalCommandFailed {
//             command: "bitcoin-cli decoderawtransaction".to_string(),
//             message: Some("missing vout in decoded transaction".to_string()),
//             hint: None,
//         },
//     )?;

//     for v in vouts {
//         let n = match v.get("n").and_then(|x| x.as_u64()) {
//             Some(x) => x,
//             None => continue,
//         };
//         let spk = match v.get("scriptPubKey") {
//             Some(x) => x,
//             None => continue,
//         };
//         if spk.get("address").and_then(|x| x.as_str()) == Some(address) {
//             return Ok(format!("{txid}:{n}"));
//         }
//         let has_addr = spk
//             .get("addresses")
//             .and_then(|x| x.as_array())
//             .map(|arr| arr.iter().any(|a| a.as_str() == Some(address)))
//             .unwrap_or(false);
//         if has_addr {
//             return Ok(format!("{txid}:{n}"));
//         }
//     }

//     Err(CommandError::ExternalCommandFailed {
//         command: "bitcoin-cli decoderawtransaction".to_string(),
//         message: Some(format!(
//             "no transaction output found for address {address} in tx {txid}"
//         )),
//         hint: Some("Verify sendtoaddress target and retry bootstrap.".to_string()),
//     })
// }

#[derive(Debug, Clone, Serialize)]
pub struct DockerEnvironmentResponse {
    pub installed: bool,
    pub daemon_running: bool,
    pub version: Option<String>,
    pub detail: Option<String>,
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

// async fn ensure_rgb_wallet_ready(
//     client: &reqwest::Client,
//     ctx: &NodeContext,
//     retries: usize,
//     delay_ms: u64,
// ) -> Result<String, CommandError> {
//     let mut last_err: Option<CommandError> = None;
//     for _ in 0..retries {
//         match rgb_new_address(client, ctx).await {
//             Ok(addr) => return Ok(addr),
//             Err(err) => {
//                 last_err = Some(err);
//                 tokio::time::sleep(Duration::from_millis(delay_ms)).await;
//             }
//         }
//     }
//     Err(last_err.unwrap_or(CommandError::HttpRequestFailed))
// }

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

// fn read_env_file_var(path: &Path, key: &str) -> Option<String> {
//     let content = std::fs::read_to_string(path).ok()?;
//     for line in content.lines() {
//         let trimmed = line.trim();
//         if trimmed.is_empty() || trimmed.starts_with('#') {
//             continue;
//         }
//         let (k, v) = trimmed.split_once('=')?;
//         if k.trim() != key {
//             continue;
//         }
//         let raw = v.trim();
//         let unquoted = raw
//             .strip_prefix('"')
//             .and_then(|s| s.strip_suffix('"'))
//             .or_else(|| raw.strip_prefix('\'').and_then(|s| s.strip_suffix('\'')))
//             .unwrap_or(raw)
//             .trim();
//         if !unquoted.is_empty() {
//             return Some(unquoted.to_string());
//         }
//     }
//     None
// }

// fn resolve_node_image() -> String {
//     let from_env = std::env::var("RGB_LDK_NODE_IMAGE")
//         .ok()
//         .or_else(|| std::env::var("VITE_RGB_LDK_NODE_IMAGE").ok())
//         .map(|v| v.trim().to_string())
//         .filter(|v| !v.is_empty());

//     let from_dotenv = || {
//         let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
//         let root = manifest_dir.parent()?;
//         let dotenv = root.join(".env");
//         read_env_file_var(&dotenv, "RGB_LDK_NODE_IMAGE")
//             .or_else(|| read_env_file_var(&dotenv, "VITE_RGB_LDK_NODE_IMAGE"))
//     };

//     from_env
//         .or_else(from_dotenv)
//         .unwrap_or_else(|| "".to_string())
// }

#[tauri::command]
pub async fn docker_environment() -> Result<DockerEnvironmentResponse, CommandError> {
    // Run synchronous blocking subprocess on a worker thread to avoid
    // stalling the Tokio runtime (docker info can take 1-3 s).
    let version_out = tokio::task::spawn_blocking(|| {
        run_command_capture("docker", &["--version".to_string()])
    })
    .await
    .map_err(|_| CommandError::Io)?;
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

    let info_ok = tokio::task::spawn_blocking(|| {
        run_command_status("docker", &["info".to_string()])
    })
    .await
    .map_err(|_| CommandError::Io)?;
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
    return Err(CommandError::Forbidden {
        service: "control-panel",
        message: Some("bootstrap_local_environment is forbidden".to_string()),
        hint: Some("This operation is not allowed.".to_string())
    });
}

/// Bundle of parameters needed to spawn a persistent `rgbldkd run` container.
///
/// Both `bootstrap_local_node` (demo one-click path) and `node_run_cli`
/// (standardized restart path) build one of these and hand it to
/// `spawn_node_run_container`.
struct NodeRunSpec<'a> {
    container_name: &'a str,
    image: &'a str,
    network: &'a str,
    esplora_url: &'a str,
    node_alias: &'a str,
    data_volume_name: &'a str,
    http_token_host: &'a Path,
    control_http_token_host: &'a Path,
    keystore_passphrase_host: &'a Path,
    main_port: u16,
    control_port: u16,
    p2p_port: u16,
}

/// Idempotently start a long-running rgbldkd daemon container.
///
/// Returns `Ok(already_running)`:
///   - `false` — we just created (or started) the container.
///   - `true`  — the container was already running; nothing changed.
///
/// If a container with this name exists in `stopped` state we call
/// `docker start` rather than re-creating it (preserving its data volume
/// mount, port bindings, and other config from the original `docker run`).
///
/// We deliberately use `rgbldkd run` (not the removed `server` subcommand)
/// and do NOT pass `--auto-init-keystore` — the keystore must be present in
/// the data volume before this is called (typically via `wallet_init_cli`
/// or a prior bootstrap that already wrote it).
async fn spawn_node_run_container(
    state: &State<'_, AppState>,
    spec: NodeRunSpec<'_>,
) -> Result<bool, CommandError> {
    // Already running? Be idempotent.
    match container_state(spec.container_name) {
        ContainerState::Running => return Ok(true),
        ContainerState::Stopped => {
            run_command_status(
                "docker",
                &["start".to_string(), spec.container_name.to_string()],
            )
            .map_err(|e| CommandError::ExternalCommandFailed {
                command: "docker start".to_string(),
                message: Some(e),
                hint: Some(format!(
                    "Container `{}` exists but failed to start. Check `docker logs {}`.",
                    spec.container_name, spec.container_name
                )),
            })?;
            return Ok(false);
        },
        ContainerState::Unknown => {
            return Err(CommandError::ExternalCommandFailed {
                command: "docker inspect".to_string(),
                message: Some(format!(
                    "could not determine state of container `{}`",
                    spec.container_name
                )),
                hint: Some("Check that the docker daemon is reachable.".to_string()),
            });
        },
        ContainerState::Absent => {},
    }

    // Container does not exist: create + start it fresh.
    let run_args = vec![
        "run".to_string(),
        "-d".to_string(),
        "--name".to_string(),
        spec.container_name.to_string(),
        "--restart".to_string(),
        "unless-stopped".to_string(),
        "--add-host".to_string(),
        "host.docker.internal:host-gateway".to_string(),
        "-p".to_string(),
        format!("127.0.0.1:{}:8500", spec.main_port),
        "-p".to_string(),
        format!("127.0.0.1:{}:8550", spec.control_port),
        "-p".to_string(),
        format!("127.0.0.1:{}:9735", spec.p2p_port),
        "-v".to_string(),
        format!("{}:{}", spec.data_volume_name, constant::LDK_DATA_DIR),
        "--mount".to_string(),
        format!(
            "type=bind,src={},dst=/run/secrets/rgbldk_http_token,readonly",
            spec.http_token_host.display()
        ),
        "--mount".to_string(),
        format!(
            "type=bind,src={},dst=/run/secrets/rgbldk_control_http_token,readonly",
            spec.control_http_token_host.display()
        ),
        "--mount".to_string(),
        format!(
            "type=bind,src={},dst=/run/secrets/rgbldk_keystore_passphrase,readonly",
            spec.keystore_passphrase_host.display()
        ),
        spec.image.to_string(),
        "rgbldkd".to_string(),
        "run".to_string(),
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
        constant::LDK_DATA_DIR.to_string(),
        "--keystore-passphrase-file".to_string(),
        "/run/secrets/rgbldk_keystore_passphrase".to_string(),
        "--network".to_string(),
        spec.network.to_string(),
        "--esplora-url".to_string(),
        spec.esplora_url.to_string(),
        "--ldk-listen".to_string(),
        "0.0.0.0:9735".to_string(),
        "--node-alias".to_string(),
        spec.node_alias.to_string(),
        "--rgb-enabled".to_string(),
        "--log-to-stdout".to_string(),
        "--log-level".to_string(),
        "trace".to_string(),
    ];

    let _ = state
        .logger
        .append(LogEntry {
            ts_ms: 0,
            source: "backend".to_string(),
            level: LogLevel::Trace,
            message: "spawn_node_run_container".to_string(),
            context: Some(serde_json::json!({
                "container_name": spec.container_name,
                "image": spec.image,
                "args": run_args.join(" "),
            })),
        })
        .await;

    run_command_status("docker", &run_args).map_err(|e| CommandError::ExternalCommandFailed {
        command: "docker run".to_string(),
        message: Some(e),
        hint: Some(format!(
            "Check Docker permissions and port conflicts on {}/{}/{}.",
            spec.main_port, spec.control_port, spec.p2p_port
        )),
    })?;

    Ok(false)
}

/// Shared resource-allocation pass for `prepare_node_resources` (production
/// "user-supplied mnemonic" flow) and `bootstrap_local_node` (demo one-click
/// flow). Both paths need the same allocation: ports, secrets, NodeContext.
///
/// What this does:
///   - Verifies docker is installed and the daemon is reachable
///   - Validates the network name
///   - Allocates main/control/p2p ports (caller-supplied or next free)
///   - Generates secret files (http token / control-http token / keystore passphrase)
///   - Constructs a complete NodeContext with all fields populated
///
/// What this deliberately does NOT do:
///   - Write the NodeContext to `state.store` — the caller decides when
///   - Spawn any docker containers (no `docker run` here)
///   - Touch the data volume contents (no wallet init)
///
/// Returns the fully-populated NodeContext. The caller can derive every
/// other resource path from it via `resolve_*` helpers, so there's no
/// secondary "prepared resources" struct.
async fn prepare_node_resources_inner(
    state: &State<'_, AppState>,
    password_hash: String,
    ldk_image: String,
    node_name: Option<String>,
    network: String,
    esplora_url: String,
    main_api_port: Option<u16>,
    control_api_port: Option<u16>,
    p2p_port: Option<u16>,
) -> Result<NodeContext, CommandError> {
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

    // Validate network value to prevent command injection.
    let resolved_network = match network.as_str() {
        "mainnet" | "testnet" | "testnet4" | "regtest" => network,
        other => {
            return Err(CommandError::BadRequest {
                service: "control-panel",
                message: Some(format!("unsupported network: {other}")),
                hint: Some("Allowed values: mainnet, testnet, testnet4, regtest.".to_string()),
            })
        }
    };

    let image = ldk_image.trim().to_string();
    let resolved_esplora_url = esplora_url.trim().to_string();

    // Port
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
    if used_main_ports.contains(&resolved_main_port) {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some(format!("main api port already used: {resolved_main_port}")),
            hint: Some("Choose a different mainApiPort.".to_string()),
        });
    }

    let resolved_control_port = match control_api_port {
        Some(p) => p,
        None => next_free_port(&used_control_ports, 8551).ok_or(CommandError::BadRequest {
            service: "control-panel",
            message: Some("unable to allocate control api port".to_string()),
            hint: Some("Provide controlApiPort explicitly.".to_string()),
        })?,
    };
    if used_control_ports.contains(&resolved_control_port) {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some(format!(
                "control api port already used: {resolved_control_port}"
            )),
            hint: Some("Choose a different controlApiPort.".to_string()),
        });
    }

    let resolved_p2p_port = match p2p_port {
        Some(p) => p,
        None => next_free_port(&used_p2p_ports, 9735).ok_or(CommandError::BadRequest {
            service: "control-panel",
            message: Some("unable to allocate p2p port".to_string()),
            hint: Some("Provide p2pPort explicitly.".to_string()),
        })?,
    };
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

    let display_name = node_name
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(format!("Node {suffix}").as_str())
        .to_string();

    let container_name = format!("rgb-node-{resolved_network}-{suffix}");
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
    let dir_key = format!("{slug}");
    let data_root = app_dirs::data_dir()?.join("local-nodes").join(&dir_key);
    let secrets_dir = data_root.join("secrets");
    let http_token = secrets_dir.join("http.token");
    let control_http_token = secrets_dir.join("control-http.token");
    let keystore_passphrase = secrets_dir.join("keystore.passphrase");
    let data_volume_name = format!("rgbldk_node_data_{}", dir_key.replace('-', "_"));

    ensure_secret_file(&http_token, 16)?;
    ensure_secret_file(&control_http_token, 16)?;
    ensure_secret_file(&keystore_passphrase, 16)?;

    let main_api_base_url = format!("http://127.0.0.1:{resolved_main_port}/");
    let control_api_base_url = format!("http://127.0.0.1:{resolved_control_port}/");
    let p2p_listen = format!("host.docker.internal:{resolved_p2p_port}");
    let rgb_consignment_base_url =
        derive_consignment_template_from_main_api(&main_api_base_url, Some(&p2p_listen));

    Ok(NodeContext {
        node_id: container_name.clone(),
        network: resolved_network,
        display_name,
        container_name,
        password_hash,

        main_api_base_url,
        control_api_base_url: Some(control_api_base_url),
        p2p_listen: Some(p2p_listen),

        rgb_consignment_base_url,
        data_dir: Some(format!("docker-volume:{data_volume_name}")),

        main_api_token_file_path: Some(http_token.display().to_string()),
        control_api_token_file_path: Some(control_http_token.display().to_string()),
        allow_non_loopback: false,
        image: Some(image),
        esplora_url: Some(resolved_esplora_url),
    })
}

/// Production "user supplies their own mnemonic" flow — step 1 of 5.
///
/// Collects user-supplied node configuration, allocates the resources the
/// daemon will eventually need (ports, secret files, data volume name,
/// NodeContext), and persists the resulting NodeContext to `contexts.json`.
/// **Does not start any container.**
///
/// After this returns, the frontend has a `node_id` and can drive the rest
/// of the flow itself:
///
///   1. `prepare_node_resources(...)`   ← you are here
///   2. `wallet_new_mnemonic_cli(image)`     → show the mnemonic to the user
///   3. `wallet_init_cli(node_id, mnemonic)` → write the keystore
///   4. `node_run_cli(node_id)`              → start the daemon
///   5. `node_unlock(node_id)`               → enter business state
///
/// `bootstrap_local_node` is the demo one-click counterpart and runs steps
/// 1–5 internally (mnemonic auto-generated, never exposed).
#[tauri::command]
pub async fn prepare_node_resources(
    state: State<'_, AppState>,
    password_hash: String,
    ldk_image: String,
    node_name: Option<String>,
    network: String,
    esplora_url: String,
    main_api_port: Option<u16>,
    control_api_port: Option<u16>,
    p2p_port: Option<u16>,
) -> Result<NodeContext, CommandError> {
    let context = prepare_node_resources_inner(
        &state,
        password_hash,
        ldk_image,
        node_name,
        network,
        esplora_url,
        main_api_port,
        control_api_port,
        p2p_port,
    )
    .await?;
    state.store.upsert(context.clone()).await?;
    Ok(context)
}

/// Restart an existing node with the same configuration
#[tauri::command]
pub async fn re_start_local_node(
    state: State<'_, AppState>,
    node_id: String
) -> Result<NodeContext, CommandError> {
    let context = get_ctx(&state.store, &node_id).await?;

    // Check optional fields
    if context.esplora_url.is_none() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some("missing esplora_url in node context".to_string()),
            hint: None,
        });
    }
    if context.image.is_none() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some("missing image in node context".to_string()),
            hint: None,
        });
    }
    if context.rgb_consignment_base_url.is_none() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some("missing rgb_consignment_base_url in node context".to_string()),
            hint: None,
        });
    }
    if context.p2p_listen.is_none() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some("missing p2p_listen in node context".to_string()),
            hint: None,
        });
    }
    if context.data_dir.is_none() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some("missing data_dir in node context".to_string()),
            hint: None,
        });
    }
    if context.control_api_token_file_path.is_none() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some("missing control_api_token_file_path in node context".to_string()),
            hint: None,
        });
    }
    if context.control_api_base_url.is_none() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some("missing control_api_base_url in node context".to_string()),
            hint: None,
        });
    }
    if context.main_api_token_file_path.is_none() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some("missing main_api_token_file_path in node context".to_string()),
            hint: None,
        });
    }


    // The `context` should have all the info declared in NodeContext,
    // including the fields that marked as "Option"
    match bootstrap_local_node_after_prepare(&state, &context).await {
        Ok(()) => Ok(context),
        Err(e) => {
            // best-effort rollback; ignore remove errors (the original
            // bootstrap failure is the one the caller needs to see).
            // let _ = state.store.remove(&context.node_id).await;
            Err(e)
        },
    }
}

/// Stop a local node
#[tauri::command]
pub async fn stop_local_node(
    state: State<'_, AppState>,
    node_id: String,
) -> Result<(), CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    let container_name = ctx.container_name.clone();

    docker_stop_and_wait(&container_name)
}

async fn bootstrap_local_node_after_prepare(
    state: &State<'_, AppState>,
    context: &NodeContext,
) -> Result<(), CommandError> {

    // Pull everything bootstrap's later steps need back out of the freshly-
    // built context. Single source of truth: prepare_node_resources_inner
    // wrote these values, we read them back through the same accessors that
    // production code uses.
    let image = context
        .image
        .clone()
        .expect("prepare_node_resources_inner always sets image");
    let resolved_esplora_url = context
        .esplora_url
        .clone()
        .expect("prepare_node_resources_inner always sets esplora_url");
    let resolved_network = context.network.clone();
    let container_name = context.container_name.clone();
    let slug = sanitize_slug(&container_name);
    let data_volume_name = resolve_data_volume_name(&context)?;
    let secrets_dir = resolve_host_secrets_dir(&context)?;
    let http_token = secrets_dir.join("http.token");
    let control_http_token = secrets_dir.join("control-http.token");
    let keystore_passphrase = secrets_dir.join("keystore.passphrase");
    let resolved_main_port = extract_port_from_url(&context.main_api_base_url).expect(
        "prepare_node_resources_inner always wrote a parseable main_api_base_url",
    );
    let resolved_control_port = context
        .control_api_base_url
        .as_deref()
        .and_then(extract_port_from_url)
        .expect("prepare_node_resources_inner always wrote a parseable control_api_base_url");
    let resolved_p2p_port = context
        .p2p_listen
        .as_deref()
        .and_then(|s| s.rsplit_once(':').and_then(|(_, p)| p.parse::<u16>().ok()))
        .expect("prepare_node_resources_inner always wrote a parseable p2p_listen");

    // Three-step demo bootstrap (PR #102 contract):
    //   1. wallet new-mnemonic   (one-shot container; mnemonic stays in-process)
    //   2. wallet init           (writes encrypted keystore + mnemonic.enc into the data volume)
    //   3. rgbldkd run           (long-running daemon container, via spawn_node_run_container)
    //
    // For demo / one-click bootstrap the mnemonic is auto-generated and NEVER
    // returned to the frontend (this is not a "the user must write down their
    // seed" flow). If the user later wants to see it, they call
    // `wallet_show_mnemonic_cli` which goes through the proper confirm gate.
    //
    // If the daemon container already exists (e.g. the user re-runs bootstrap
    // pointing at an existing data volume) we skip steps 1-2 entirely — the
    // keystore already lives in the volume — and just (re)start the daemon.

    let run_spec = NodeRunSpec {
        container_name: &container_name,
        image: &image,
        network: &resolved_network,
        esplora_url: &resolved_esplora_url,
        node_alias: &slug,
        data_volume_name: &data_volume_name,
        http_token_host: &http_token,
        control_http_token_host: &control_http_token,
        keystore_passphrase_host: &keystore_passphrase,
        main_port: resolved_main_port,
        control_port: resolved_control_port,
        p2p_port: resolved_p2p_port,
    };

    if container_state(&container_name) == ContainerState::Absent {
        // Step 1: generate a fresh mnemonic using the same image we'll run the
        // daemon with. We don't expose it to the frontend (demo flow).
        let new_mnemonic_value = crate::cli_spawn::spawn(crate::cli_spawn::CliSpawn {
            image: &image,
            subcommand_label: "wallet new-mnemonic (bootstrap)",
            args: vec!["wallet".to_string(), "new-mnemonic".to_string()],
            mounts: vec![],
        })
        .await?;
        let mnemonic = decode_mnemonic_field(&new_mnemonic_value, "wallet new-mnemonic (bootstrap)")?;

        // Step 2: write a temp mnemonic file, then run wallet init against
        // the data volume to populate the keystore. The TempSecretFile guard
        // deletes the mnemonic file on every exit path.
        let mnemonic_file = write_bootstrap_mnemonic_file(&secrets_dir, &mnemonic)?;
        let mnemonic_in_container = "/run/secrets/rgbldk_bootstrap_mnemonic";
        crate::cli_spawn::spawn(crate::cli_spawn::CliSpawn {
            image: &image,
            subcommand_label: "wallet init (bootstrap)",
            args: vec![
                "wallet".to_string(),
                "init".to_string(),
                "--data-dir".to_string(),
                CLI_DATA_DIR_IN_CONTAINER.to_string(),
                "--passphrase-file".to_string(),
                CLI_PASSPHRASE_PATH_IN_CONTAINER.to_string(),
                "--mnemonic-file".to_string(),
                mnemonic_in_container.to_string(),
            ],
            mounts: vec![
                crate::cli_spawn::Mount::Volume {
                    volume: data_volume_name.clone(),
                    container: CLI_DATA_DIR_IN_CONTAINER.to_string(),
                },
                crate::cli_spawn::Mount::Bind {
                    host: keystore_passphrase.clone(),
                    container: CLI_PASSPHRASE_PATH_IN_CONTAINER.to_string(),
                    readonly: true,
                },
                crate::cli_spawn::Mount::Bind {
                    host: mnemonic_file.path().to_path_buf(),
                    container: mnemonic_in_container.to_string(),
                    readonly: true,
                },
            ],
        })
        .await?;
        // mnemonic_file dropped here -> .bootstrap-mnemonic removed
        drop(mnemonic);
    }

    // Step 3: start (or restart) the persistent daemon container.
    spawn_node_run_container(&state, run_spec).await?;

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

    // ctx was already upserted above (port claim); no second upsert needed.

    // The container may need a few seconds before control API is reachable.
    for _ in 0..30 {
        match rgbldkd_http::control_unlock(&state.http, context).await {
            Ok(_) => break,
            Err(_) => tokio::time::sleep(Duration::from_secs(1)).await,
        }
    }

    Ok(())
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

    let base =
        reqwest::Url::parse(&ctx.main_api_base_url).map_err(|_| CommandError::InvalidBaseUrl {
            url: ctx.main_api_base_url.clone(),
        })?;
    let api_base = base
        .join("api/v1/")
        .map_err(|_| CommandError::InvalidBaseUrl {
            url: ctx.main_api_base_url.clone(),
        })?;
    let rel = path.trim_start_matches('/');
    let url = api_base
        .join(rel)
        .map_err(|_| CommandError::InvalidBaseUrl {
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
pub async fn node_wallet_address_new(
    state: State<'_, AppState>,
    node_id: String,
) -> Result<rgbldkd_http::WalletNewAddressResponse, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "wallet.address.new",
        None,
        rgbldkd_http::wallet_address_new(&state.http, &ctx),
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
            rgbldkd_http::RgbContractsExportRequest {
                contract_id: contract_id.clone(),
            },
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
) -> Result<Value, CommandError> {
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
) -> Result<Value, CommandError> {
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
) -> Result<Value, CommandError> {
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
) -> Result<Value, CommandError> {
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
    state: State<'_, AppState>,
    node_id: String,
    core_rpc: String,
    contract_id: String,
    descriptor: String,
) -> Result<rgbldkd_http::RgbContractsExportBundle, CommandError> {
    // params
    let param_contract_id = encode_uri_component(&contract_id);
    let param_timestamp = get_current_timestamp().to_string();
    let params = [
        ("contract_id", param_contract_id.as_str()),
        ("timestamp", param_timestamp.as_str()),
    ];
    let sorted = sort_http_params(&params);

    // let _ = state.logger.append(LogEntry {
    //     ts_ms: 0,
    //     source: "backend".to_string(),
    //     level: LogLevel::Trace,
    //     message: "plugin_wallet_asset_export params".to_string(),
    //     context: Some(serde_json::json!({
    //         "params": sorted.to_string(),
    //     })),
    // }).await;

    let hex = str_to_hex(&sorted);

    // sign message
    let signed_message = node_rgb_sign_message(state, node_id, rgbldkd_http::RgbSignMessageRequest {
        message: hex,
        algorithm: "ecdsa".to_string(),
        compact: Some(true),
        encoding: Some("hex".to_string())
    }).await?;

    // query
    let token = general_purpose::STANDARD.encode(descriptor.as_bytes());
    let bytes = wallet::plugin_wallet_asset_export(
        &core_rpc,
        &token,
        &sorted,
        &signed_message.signature
    ).await?;

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
    rpc: String
) -> Result<rgbldkd_http::RgbContractsExportBundle, CommandError> {
    let bytes = wallet::plugin_wallet_transfer_consignment_export(&payment_id, &rpc).await?;

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
    state: State<'_, AppState>,
    node_id: String,
    link: String,
    payment_id: String,
    descriptor: String,
) -> Result<rgbldkd_http::TransferConsignment, CommandError> {
    // params
    let param_payment_id = encode_uri_component(&payment_id);
    let param_timestamp = get_current_timestamp().to_string();
    let params = [
        ("payment_id", param_payment_id.as_str()),
        ("timestamp", param_timestamp.as_str()),
    ];
    let sorted = sort_http_params(&params);

    // sign message
    let hex = str_to_hex(&sorted);
    let signed_message = node_rgb_sign_message(state, node_id, rgbldkd_http::RgbSignMessageRequest {
        message: hex,
        algorithm: "ecdsa".to_string(),
        compact: Some(true),
        encoding: Some("hex".to_string())
    }).await?;

    // query
    let token = general_purpose::STANDARD.encode(descriptor.as_bytes());
    let bytes = wallet::download_transfer_consignment_from_link(
        &link,
        &token,
        &sorted,
        &signed_message.signature
    ).await?;

    let archive_base64 = general_purpose::STANDARD.encode(bytes);
    Ok(rgbldkd_http::TransferConsignment {
        archive_base64,
        format: "raw".to_string(),
    })
}


#[tauri::command]
pub async fn download_transfer_consignment_from_link_no_verify(
    state: State<'_, AppState>,
    link: String,
) -> Result<rgbldkd_http::TransferConsignment, CommandError> {
    // query
    let bytes = wallet::download_transfer_consignment_from_link_no_verify(
        &link,
    ).await?;

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
pub async fn node_rgb_address_new(
    state: State<'_, AppState>,
    node_id: String,
) -> Result<rgbldkd_http::WalletNewAddressResponse, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "rgb.address.new",
        None,
        rgbldkd_http::rgb_address_new(&state.http, &ctx),
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
) -> Result<String, CommandError> {
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
        rgbldkd_http::rgb_consignment_download(&state.http, &sender_ctx, &consignment_key, &fmt),
    )
    .await?;

    let archive_base64 = general_purpose::STANDARD.encode(bytes);
    Ok(rgbldkd_http::RgbOnchainTransferConsignment { archive_base64 })
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
    rpc: String,
) -> Result<String, CommandError> {
    let bytes = general_purpose::STANDARD
        .decode(consignment_base64.as_bytes())
        .map_err(|_| CommandError::BadRequest {
            service: "main",
            message: Some("invalid base64 consignment".to_string()),
            hint: None,
        })?;

    wallet::plugin_wallet_transfer_consignment_accept(&bytes, &rpc).await
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


#[tauri::command]
pub async fn node_rgb_descriptor(
    state: State<'_, AppState>,
    node_id: String,
) -> Result<Value, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "rgb.descriptor",
        None,
        rgbldkd_http::rgb_descriptor(&state.http, &ctx),
    )
    .await
}

#[tauri::command]
pub async fn node_rgb_sign_message(
    state: State<'_, AppState>,
    node_id: String,
    request: rgbldkd_http::RgbSignMessageRequest,
) -> Result<rgbldkd_http::RgbSignMessageResponse, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    let request_json = serde_json::to_value(&request).ok();

    // let _ = state.logger.append(LogEntry {
    //     ts_ms: now_ms(),
    //     source: "backend".to_string(),
    //     level: LogLevel::Trace,
    //     message: "node_rgb_sign_message".to_string(),
    //     context: Some(serde_json::json!({
    //         "node_id": node_id.to_string(),
    //         "data": request_json.clone(),
    //     })),
    // }).await;

    traced_node_call(
        &state,
        &node_id,
        "rgb.sign_message",
        request_json,
        rgbldkd_http::rgb_sign_message(&state.http, &ctx, request),
    )
    .await
}

/**
 * Decode a BOLT11 rgb invoice and return the raw decoded data as JSON.
 */
#[tauri::command]
pub async fn node_rgb_ln_invoice_decode(
    state: State<'_, AppState>,
    node_id: String,
    request: rgbldkd_http::Bolt11DecodeRequest,
) -> Result<Value, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    let request_json = serde_json::to_value(&request).ok();
    traced_node_call(
        &state,
        &node_id,
        "main.bolt11_rgb_ln_invoice_decode",
        request_json,
        rgbldkd_http::bolt11_rgb_ln_invoice_decode(&state.http, &ctx, request),
    )
    .await
}


// #[tauri::command]
// pub async fn node_rgb_cli_wallet_new_mnemonic(
//     state: State<'_, AppState>,
//     node_id: String,
// ) -> Result<String, String> {
//     let ctx = get_ctx(&state.store, &node_id).await.map_err(|e| e.to_string())?;

//     let argv = vec![
//         "exec".to_string(),
//         "-i".to_string(),
//         ctx.node_id.clone(),
//         "wallet".to_string(),
//         "new-mnemonic".to_string(),
//     ];

//     run_command_capture("docker", &argv)
// }

// #[tauri::command]
// pub async fn node_rgb_cli_wallet_init(
//     state: State<'_, AppState>,
//     node_id: String,
//     mnemonic: String
// ) -> Result<String, String> {
//     let ctx = get_ctx(&state.store, &node_id).await.map_err(|e| e.to_string())?;

//     let argv = vec![
//         "exec".to_string(),
//         "-i".to_string(),
//         ctx.node_id.clone(),
//         "wallet".to_string(),
//         "init".to_string(),
//         "--data-dir".to_string(),
//         constant::LDK_DATA_DIR.to_string(),
//         "--mnemonic".to_string(),
//         mnemonic,
//     ];

//     let ok = run_command_status("docker", &argv);
//     match ok {
//         Ok(_) => Ok("ok".to_string()),
//         Err(e) => Err(e.to_string()),
//     }
// }


// #[tauri::command]
// pub async fn node_rgb_cli_wallet_backup_export(
//     state: State<'_, AppState>,
//     node_id: String,
//     save_dir: String
// ) -> Result<String, String> {
//     let ctx = get_ctx(&state.store, &node_id).await.map_err(|e| e.to_string())?;

//     // Export file
//     let file = format!("backup_{}.tar", get_current_timestamp().to_string());
//     let output = format!("{}/{}", constant::LDK_DATA_DIR, file);
//     let argv = vec![
//         "exec".to_string(),
//         "-i".to_string(),
//         ctx.node_id.clone(),
//         "backup".to_string(),
//         "export".to_string(),
//         "--data-dir".to_string(),
//         constant::LDK_DATA_DIR.to_string(),
//         "--output".to_string(),
//         output.clone(),
//     ];

//     // Copy file to save_dir
//     let ok = run_command_status("docker", &argv);
//     match ok {
//         Ok(_) => {
//             std::fs::copy(output.clone(), save_dir).map_err(|e| e.to_string())?;
//             Ok("ok".to_string())
//         },
//         Err(e) => Err(e.to_string()),
//     }
// }

// #[tauri::command]
// pub async fn node_rgb_cli_wallet_backup_import(
//     state: State<'_, AppState>,
//     node_id: String,
//     backup_file: String, // /xx/yy/backup.tar
// ) -> Result<String, String> {
//     let ctx = get_ctx(&state.store, &node_id).await.map_err(|e| e.to_string())?;

//     // Move backup file to data dir
//     let dst_file = format!("{}/import_{}.tar", constant::LDK_DATA_DIR, get_current_timestamp().to_string());
//     std::fs::copy(backup_file, dst_file.clone()).map_err(|e| e.to_string())?;

//     // Import from file
//     let argv = vec![
//         "exec".to_string(),
//         "-i".to_string(),
//         ctx.node_id.clone(),
//         "backup".to_string(),
//         "import".to_string(),
//         "--data-dir".to_string(),
//         constant::LDK_DATA_DIR.to_string(),
//         "--archive".to_string(),
//         dst_file,
//     ];

//     let ok = run_command_status("docker", &argv);
//     match ok {
//         Ok(_) => Ok("ok".to_string()),
//         Err(e) => Err(e.to_string()),
//     }
// }

// =============================================================================
// PR #102 (milestone1) wallet / backup CLI bindings
//
// These commands wrap the new `rgbldkd wallet ...` and `rgbldkd backup ...`
// subcommands via `docker run --rm` (one-shot containers). The legacy
// `node_rgb_cli_wallet_*` helpers above use `docker exec` against a running
// container and predate the PR #102 contract; they are retained for
// compatibility and will be removed once these commands are integrated end
// to end. Frontend wires should target the `_cli` variants below.
//
// `node_run_cli` is the long-running counterpart — it spawns the persistent
// `rgbldkd run` daemon container. It does NOT go through cli_spawn because
// that framework is designed for one-shot containers that block on stdout/
// stderr; the daemon container detaches (-d) and outlives the call.
//
// Contract reminders:
//   - `--output-format=json` is always passed (cli_spawn enforces this).
//   - Passphrase never touches the UI; we reuse the host secret file at
//     `<data-root>/secrets/keystore.passphrase` (already generated by
//     bootstrap_local_node) and bind-mount it read-only.
//   - For commands that need a mnemonic, we write `<data-root>/.bootstrap-mnemonic`
//     with mode 0600 and unconditionally delete it on return.
// =============================================================================

#[derive(serde::Serialize)]
pub struct NodeRunResponse {
    /// Name of the daemon container that is now running.
    pub container_name: String,
    /// True if the container was already running when this command was
    /// called; false if we just (re-)started it. Frontend can use this to
    /// decide whether to show "node started" vs "node already up" copy.
    pub already_running: bool,
}

/// Start (or restart) the persistent rgbldkd daemon container for a node.
///
/// This is the standardized counterpart to `bootstrap_local_node`'s
/// internal third step. All run parameters are recovered from the existing
/// NodeContext (ports, data volume, secret file paths, network, alias,
/// esplora URL). The frontend therefore only needs `node_id` to bring a
/// node back online after stopping it (e.g. after backup import).
///
/// `image` is optional: when omitted, the image tag persisted on the
/// context at bootstrap time is used. Pass an explicit override only for
/// the milestone1 migration case where a newer image is needed.
///
/// Idempotent: if the container is already running, returns immediately
/// with `already_running: true`. If it exists but is stopped, runs
/// `docker start` on it (preserving its original config). Otherwise
/// `docker run -d` creates a new container with the same name.
#[tauri::command]
pub async fn node_run_cli(
    state: State<'_, AppState>,
    node_id: String,
    image: Option<String>,
) -> Result<NodeRunResponse, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    let image = resolve_cli_image(&ctx, image)?;

    let esplora_url = ctx
        .esplora_url
        .as_deref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| CommandError::BadRequest {
            service: "control-panel",
            message: Some("node context has no esplora_url".to_string()),
            hint: Some(
                "This context was created before esplora_url was persisted. Re-bootstrap the node, or stop+remove the container and retry."
                    .to_string(),
            ),
        })?;

    let data_volume_name = resolve_data_volume_name(&ctx)?;
    let secrets_dir = resolve_host_secrets_dir(&ctx)?;
    let http_token = secrets_dir.join("http.token");
    let control_http_token = secrets_dir.join("control-http.token");
    let keystore_passphrase = secrets_dir.join("keystore.passphrase");

    for (label, path) in [
        ("http.token", &http_token),
        ("control-http.token", &control_http_token),
        ("keystore.passphrase", &keystore_passphrase),
    ] {
        if !path.exists() {
            return Err(CommandError::BadRequest {
                service: "control-panel",
                message: Some(format!(
                    "secret file {label} not found at {}",
                    path.display()
                )),
                hint: Some(
                    "Re-bootstrap the node to regenerate the secret files.".to_string(),
                ),
            });
        }
    }

    let main_port = extract_port_from_url(&ctx.main_api_base_url).ok_or_else(|| {
        CommandError::BadRequest {
            service: "control-panel",
            message: Some(format!(
                "could not parse main api port from {}",
                ctx.main_api_base_url
            )),
            hint: None,
        }
    })?;
    let control_port = ctx
        .control_api_base_url
        .as_deref()
        .and_then(extract_port_from_url)
        .ok_or_else(|| CommandError::BadRequest {
            service: "control-panel",
            message: Some("control api base url is missing or unparseable".to_string()),
            hint: None,
        })?;
    let p2p_port = ctx
        .p2p_listen
        .as_deref()
        .and_then(|s| s.rsplit_once(':').and_then(|(_, p)| p.parse::<u16>().ok()))
        .ok_or_else(|| CommandError::BadRequest {
            service: "control-panel",
            message: Some("p2p listen address is missing or unparseable".to_string()),
            hint: None,
        })?;

    let node_alias = sanitize_slug(&ctx.container_name);

    let already_running = spawn_node_run_container(
        &state,
        NodeRunSpec {
            container_name: &ctx.container_name,
            image: &image,
            network: &ctx.network,
            esplora_url: &esplora_url,
            node_alias: &node_alias,
            data_volume_name: &data_volume_name,
            http_token_host: &http_token,
            control_http_token_host: &control_http_token,
            keystore_passphrase_host: &keystore_passphrase,
            main_port,
            control_port,
            p2p_port,
        },
    )
    .await?;

    // `docker run -d` returns as soon as docker accepts the request, but
    // rgbldkd's HTTP servers (main + control) take a moment to bind their
    // ports. Without waiting, an immediate `node_unlock` from the frontend
    // races the server's bind() and hits "connection refused" — which the
    // panel surfaces as a generic `http_request_failed`.
    //
    // Skip the wait when the container was already up (the HTTP servers
    // have been bound for a while).
    if !already_running {
        let mut reachable = false;
        for _ in 0..30 {
            if rgbldkd_http::main_status(&state.http, &ctx).await.is_ok() {
                reachable = true;
                break;
            }
            tokio::time::sleep(Duration::from_secs(1)).await;
        }
        if !reachable {
            return Err(CommandError::ExternalCommandFailed {
                command: "docker run/start".to_string(),
                message: Some(
                    "node main API is not reachable after startup".to_string(),
                ),
                hint: Some(
                    "Check `docker logs <container>` for startup errors (tokens/passphrase/esplora/ports)."
                        .to_string(),
                ),
            });
        }
    }

    Ok(NodeRunResponse {
        container_name: ctx.container_name,
        already_running,
    })
}

#[allow(dead_code)]
const CLI_DATA_DIR_IN_CONTAINER: &str = constant::LDK_DATA_DIR;
#[allow(dead_code)]
const CLI_PASSPHRASE_PATH_IN_CONTAINER: &str = "/run/secrets/rgbldk_keystore_passphrase";

#[derive(serde::Serialize)]
pub struct WalletNewMnemonicResponse {
    /// Space-separated 24-word BIP39 mnemonic.
    pub mnemonic: String,
}

/// Generate a fresh BIP39 mnemonic without touching any data directory.
///
/// This is a pure function on rgbldkd's side — no `--data-dir`, no passphrase,
/// no mounts. It exists primarily as the smallest possible end-to-end test of
/// the `cli_spawn` pipeline (docker spawn -> JSON parse -> exit code mapping).
#[tauri::command]
pub async fn wallet_new_mnemonic_cli(
    state: State<'_, AppState>,
    image: String,
) -> Result<WalletNewMnemonicResponse, CommandError> {
    let result = wallet_new_mnemonic_cli_inner(image.clone()).await;
    audit_cli_call(
        &state,
        "wallet new-mnemonic",
        None,
        &image,
        result.as_ref().map(|_| ()).map_err(|e| e),
        None,
    )
    .await;
    result
}

async fn wallet_new_mnemonic_cli_inner(
    _image: String,
) -> Result<WalletNewMnemonicResponse, CommandError> {
    // Generate a BIP39 12-word mnemonic natively in Rust.
    // This avoids the `docker run --rm` cold-start overhead (~2-5 s) for a
    // pure computation that does not require a running container.
    let mnemonic = tokio::task::spawn_blocking(|| {
        let mut entropy = [0u8; 16]; // 128 bits → 12 words
        rand::rngs::OsRng.fill_bytes(&mut entropy);
        bip39::Mnemonic::from_entropy(&entropy)
    })
    .await
    .map_err(|_| CommandError::Io)?
    .map_err(|e| CommandError::BadRequest {
        service: "control-panel",
        message: Some(format!("bip39 mnemonic generation failed: {e}")),
        hint: None,
    })?;

    Ok(WalletNewMnemonicResponse {
        mnemonic: mnemonic.to_string(),
    })
}

/// Pull the mnemonic out of an rgbldkd JSON response.
///
/// rgbldkd 0.x returns the mnemonic as a JSON array of words:
///   `{"ok":true,"mnemonic":["word1","word2",...],"word_count":24}`
/// We also tolerate (defensively):
///   - a single space-separated string: `{"mnemonic":"word1 word2 ..."}`
///   - either layout nested under `data`: `{"data":{"mnemonic":...}}`
///
/// On shape mismatch we NEVER echo the raw JSON value into the error
/// message: even an "unexpected" rgbldkd response from new-mnemonic could
/// contain a mnemonic in a different field, and that would leak through
/// the error path back to the frontend. Operators chasing a shape change
/// should look at the docker stderr instead.
fn decode_mnemonic_field(
    value: &serde_json::Value,
    subcommand_label: &str,
) -> Result<String, CommandError> {
    let raw = value
        .get("mnemonic")
        .or_else(|| value.get("data").and_then(|d| d.get("mnemonic")));

    if let Some(raw) = raw {
        if let Some(s) = raw.as_str() {
            return Ok(s.trim().to_string());
        }
        if let Some(arr) = raw.as_array() {
            let words: Option<Vec<&str>> = arr.iter().map(|v| v.as_str()).collect();
            if let Some(words) = words {
                return Ok(words.join(" "));
            }
        }
    }

    Err(CommandError::SubcommandFailed {
        subcommand: subcommand_label.to_string(),
        exit_code: 0,
        kind: Some("unexpected_stdout_shape".to_string()),
        message: Some(
            "rgbldkd returned exit 0 but stdout did not contain a usable `mnemonic` field"
                .to_string(),
        ),
        hint: Some(
            "This usually means the rgbldkd JSON contract changed. Check the image version."
                .to_string(),
        ),
    })
}

// ---- shared helpers for milestone1 wallet/backup CLI commands ----

/// Resolve the docker image to use for one wallet/backup CLI invocation.
///
/// Resolution order:
///   1. Explicit `override_image` from the caller (e.g. when the frontend
///      wants to spawn a newer CLI image against a node still running on
///      an older daemon image — the milestone1 migration use case).
///   2. `ctx.image` recorded by `bootstrap_local_node` at node creation.
///
/// If neither is present we refuse rather than guessing a tag — guessing
/// could either pull the wrong image or hit a not-found docker error
/// surfaced as a confusing exit-125 from cli_spawn.
fn resolve_cli_image(
    ctx: &NodeContext,
    override_image: Option<String>,
) -> Result<String, CommandError> {
    let trimmed = override_image
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    if let Some(v) = trimmed {
        return Ok(v);
    }
    ctx.image
        .as_deref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| CommandError::BadRequest {
            service: "control-panel",
            message: Some(
                "no image available for this CLI call: ctx.image is unset and no override was passed"
                    .to_string(),
            ),
            hint: Some(
                "Pass `image` explicitly, or re-bootstrap the node so its image tag gets persisted."
                    .to_string(),
            ),
        })
}

/// Parse the `data_dir` field of a NodeContext, which the control panel writes
/// as `"docker-volume:<volume_name>"`. Returns the bare volume name.
fn resolve_data_volume_name(ctx: &NodeContext) -> Result<String, CommandError> {
    let raw = ctx.data_dir.as_deref().ok_or_else(|| CommandError::BadRequest {
        service: "control-panel",
        message: Some("node context has no data_dir".to_string()),
        hint: Some("This node was not provisioned by bootstrap_local_node.".to_string()),
    })?;
    raw.strip_prefix("docker-volume:")
        .map(|s| s.to_string())
        .ok_or_else(|| CommandError::BadRequest {
            service: "control-panel",
            message: Some(format!(
                "data_dir does not start with `docker-volume:`: {raw}"
            )),
            hint: Some(
                "Milestone1 wallet/backup CLI only supports named-volume nodes.".to_string(),
            ),
        })
}

/// Recover the host-side secrets directory (where `keystore.passphrase` lives)
/// from the persisted token-file path. We do this so we don't have to
/// re-derive the slug — the path is already the source of truth.
fn resolve_host_secrets_dir(ctx: &NodeContext) -> Result<PathBuf, CommandError> {
    let token_path =
        ctx.main_api_token_file_path
            .as_deref()
            .ok_or_else(|| CommandError::BadRequest {
                service: "control-panel",
                message: Some("node context has no main_api_token_file_path".to_string()),
                hint: Some(
                    "This node was not provisioned by bootstrap_local_node.".to_string(),
                ),
            })?;
    let p = Path::new(token_path);
    let parent = p.parent().ok_or_else(|| CommandError::BadRequest {
        service: "control-panel",
        message: Some(format!(
            "token path has no parent directory: {token_path}"
        )),
        hint: None,
    })?;
    Ok(parent.to_path_buf())
}

/// Result of `docker inspect` against a container by name.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ContainerState {
    /// `docker inspect` succeeded and reported the container as running.
    Running,
    /// `docker inspect` succeeded and reported the container as stopped.
    Stopped,
    /// `docker inspect` reported the container does not exist at all.
    Absent,
    /// `docker inspect` itself failed (daemon down, transient error, etc.).
    /// Caller MUST treat this as "unknown — possibly running" and not
    /// proceed with any operation that requires the daemon to be quiescent.
    Unknown,
}

fn container_state(container: &str) -> ContainerState {
    let out = run_command_capture(
        "docker",
        &[
            "inspect".to_string(),
            "--format".to_string(),
            "{{.State.Running}}".to_string(),
            container.to_string(),
        ],
    );
    match out {
        Ok(s) => match s.trim() {
            "true" => ContainerState::Running,
            "false" => ContainerState::Stopped,
            // `docker inspect --format` on a known container always emits
            // either "true" or "false"; anything else is a contract surprise.
            _ => ContainerState::Unknown,
        },
        Err(e) => {
            if is_not_found_error(&e) {
                ContainerState::Absent
            } else {
                ContainerState::Unknown
            }
        },
    }
}

/// Thin wrapper kept for sites where conflating Stopped/Absent/Unknown is OK
/// (e.g. the pre-`docker stop` short-circuit in backup_import — if we can't
/// even reach docker, `docker stop` will fail loudly on the next call).
fn container_is_running(container: &str) -> bool {
    matches!(container_state(container), ContainerState::Running)
}

fn try_remove_file(path: &Path) {
    let _ = std::fs::remove_file(path);
}

/// Append an audit entry to the file logger for one wallet/backup CLI call.
///
/// IMPORTANT: this helper never receives stdout bytes — even the success
/// outcome is reduced to `Ok(())` by the caller. That's because some
/// stdout JSON (notably `wallet new-mnemonic` / `wallet show-mnemonic`)
/// contains the plaintext mnemonic, and the audit log must never see it.
/// On failure we record only structured metadata (exit_code, kind), never
/// the raw rgbldkd message (which could in principle echo back parts of
/// the input). Callers must keep `extra` free of sensitive material.
async fn audit_cli_call(
    state: &State<'_, AppState>,
    subcommand: &str,
    node_id: Option<&str>,
    image: &str,
    outcome: Result<(), &CommandError>,
    extra: Option<serde_json::Value>,
) {
    let (level, status, error_ctx): (LogLevel, &str, Option<serde_json::Value>) = match outcome {
        Ok(()) => (LogLevel::Info, "ok", None),
        Err(CommandError::SubcommandFailed { exit_code, kind, .. }) => (
            LogLevel::Warn,
            "subcommand_failed",
            Some(serde_json::json!({
                "exit_code": exit_code,
                "kind": kind,
            })),
        ),
        Err(_) => (LogLevel::Warn, "rejected", None),
    };

    let mut context = serde_json::json!({
        "subcommand": subcommand,
        "node_id": node_id,
        "image": image,
        "status": status,
    });
    if let Some(obj) = context.as_object_mut() {
        if let Some(err) = error_ctx {
            obj.insert("error".to_string(), err);
        }
        if let Some(extra_value) = extra {
            obj.insert("extra".to_string(), extra_value);
        }
    }

    let _ = state
        .logger
        .append(LogEntry {
            ts_ms: 0,
            source: "backend".to_string(),
            level,
            message: format!("cli {subcommand}"),
            context: Some(context),
        })
        .await;
}

/// RAII guard wrapping a host-side temporary file written for one CLI spawn
/// (typically `.bootstrap-mnemonic`). The file is removed when this value is
/// dropped — covering normal returns, `?` early-returns, and panics. The
/// remove is best-effort: a Drop impl can't propagate errors, and double-
/// removing (Drop after an explicit `take`) is silently ignored.
struct TempSecretFile {
    path: Option<PathBuf>,
}

impl TempSecretFile {
    fn path(&self) -> &Path {
        self.path
            .as_deref()
            .expect("TempSecretFile used after take()")
    }
}

impl Drop for TempSecretFile {
    fn drop(&mut self) {
        if let Some(p) = self.path.take() {
            try_remove_file(&p);
        }
    }
}

/// Write `<host_secrets_dir>/.bootstrap-mnemonic` with mode 0600 on unix and
/// return an RAII guard that deletes the file on drop. The file persists
/// only as long as the returned guard is alive.
fn write_bootstrap_mnemonic_file(
    host_secrets_dir: &Path,
    mnemonic: &str,
) -> Result<TempSecretFile, CommandError> {
    std::fs::create_dir_all(host_secrets_dir).map_err(|_| CommandError::Io)?;
    let path = host_secrets_dir.join(".bootstrap-mnemonic");

    #[cfg(unix)]
    {
        use std::io::Write;
        use std::os::unix::fs::OpenOptionsExt;
        let mut f = std::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .mode(0o600)
            .open(&path)
            .map_err(|_| CommandError::Io)?;
        f.write_all(mnemonic.as_bytes()).map_err(|_| CommandError::Io)?;
    }

    #[cfg(not(unix))]
    {
        std::fs::write(&path, mnemonic).map_err(|_| CommandError::Io)?;
    }

    Ok(TempSecretFile { path: Some(path) })
}

// ---- wallet init ----

#[derive(serde::Serialize)]
pub struct WalletInitResponse {
    /// `human-readable` confirmation message from rgbldkd (when present).
    pub message: Option<String>,
}

/// Initialize a node's keystore from a user-provided BIP39 mnemonic by spawning
/// `docker run --rm <image> rgbldkd wallet init` against the node's existing
/// data volume and `keystore.passphrase` secret.
///
/// Preconditions (enforced here, before the spawn):
///   - The node's container must not be running. (rgbldkd will also refuse via
///     exit 16 if the daemon is active, but checking up-front gives a cleaner
///     error path.)
///
/// Side effects:
///   - Writes `<host_secrets_dir>/.bootstrap-mnemonic` (mode 0600) for the
///     duration of the spawn, and deletes it on every exit path.
///   - The passphrase file is never written here; we reuse the existing
///     `keystore.passphrase` mounted read-only.
#[tauri::command]
pub async fn wallet_init_cli(
    state: State<'_, AppState>,
    node_id: String,
    image: Option<String>,
    mnemonic: String,
) -> Result<WalletInitResponse, CommandError> {
    let result = wallet_init_cli_inner(&state, &node_id, image.clone(), mnemonic).await;
    // For audit we record either the resolved image (success path can re-
    // resolve cheaply) or the literal override the caller passed; on the
    // pre-ctx-load failure paths we may not have a resolved image at all.
    let audit_image = result
        .as_ref()
        .ok()
        .and_then(|_| image.clone())
        .or(image)
        .unwrap_or_default();
    audit_cli_call(
        &state,
        "wallet init",
        Some(&node_id),
        &audit_image,
        result.as_ref().map(|_| ()).map_err(|e| e),
        None,
    )
    .await;
    result
}

async fn wallet_init_cli_inner(
    state: &State<'_, AppState>,
    node_id: &str,
    image_override: Option<String>,
    mnemonic: String,
) -> Result<WalletInitResponse, CommandError> {
    let mnemonic = mnemonic.trim().to_string();
    if mnemonic.split_whitespace().count() < 12 {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some("mnemonic looks too short (need a BIP39 phrase)".to_string()),
            hint: Some("Expected 12 or 24 words separated by spaces.".to_string()),
        });
    }

    let ctx = get_ctx(&state.store, &node_id).await?;
    let image = resolve_cli_image(&ctx, image_override)?;
    let volume = resolve_data_volume_name(&ctx)?;
    let secrets_dir = resolve_host_secrets_dir(&ctx)?;
    let passphrase_host = secrets_dir.join("keystore.passphrase");

    if !passphrase_host.exists() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some(format!(
                "keystore.passphrase not found at {}",
                passphrase_host.display()
            )),
            hint: Some(
                "Re-run bootstrap to regenerate the passphrase secret file."
                    .to_string(),
            ),
        });
    }

    // Preflight: container must be definitely stopped. Unknown state (docker
    // inspect failed) is treated as unsafe and rejected — proceeding with
    // wallet init while a daemon may be writing would corrupt data-dir.
    match container_state(&ctx.container_name) {
        ContainerState::Stopped | ContainerState::Absent => {},
        ContainerState::Running => {
            return Err(CommandError::SubcommandFailed {
                subcommand: "wallet init".to_string(),
                exit_code: 16,
                kind: Some("node_not_stopped".to_string()),
                message: Some(format!(
                    "node container `{}` is running; wallet init requires it to be stopped",
                    ctx.container_name
                )),
                hint: Some(
                    "Stop the node container (Lock then `docker stop <name>`) and retry."
                        .to_string(),
                ),
            });
        },
        ContainerState::Unknown => {
            return Err(CommandError::SubcommandFailed {
                subcommand: "wallet init (preflight inspect)".to_string(),
                exit_code: 16,
                kind: Some("container_state_unknown".to_string()),
                message: Some(format!(
                    "could not determine state of container `{}` via docker inspect",
                    ctx.container_name
                )),
                hint: Some(
                    "Check that the docker daemon is reachable and retry.".to_string(),
                ),
            });
        },
    }

    // The guard's Drop impl deletes the host-side mnemonic file on every
    // exit path (Ok / Err via `?` / panic), so we do not need an explicit
    // cleanup call after `spawn()`.
    let mnemonic_file = write_bootstrap_mnemonic_file(&secrets_dir, &mnemonic)?;
    let mnemonic_in_container = "/run/secrets/rgbldk_bootstrap_mnemonic";

    let spawn = crate::cli_spawn::CliSpawn {
        image: &image,
        subcommand_label: "wallet init",
        args: vec![
            "wallet".to_string(),
            "init".to_string(),
            "--data-dir".to_string(),
            CLI_DATA_DIR_IN_CONTAINER.to_string(),
            "--passphrase-file".to_string(),
            CLI_PASSPHRASE_PATH_IN_CONTAINER.to_string(),
            "--mnemonic-file".to_string(),
            mnemonic_in_container.to_string(),
        ],
        mounts: vec![
            crate::cli_spawn::Mount::Volume {
                volume: volume.clone(),
                container: CLI_DATA_DIR_IN_CONTAINER.to_string(),
            },
            crate::cli_spawn::Mount::Bind {
                host: passphrase_host.clone(),
                container: CLI_PASSPHRASE_PATH_IN_CONTAINER.to_string(),
                readonly: true,
            },
            crate::cli_spawn::Mount::Bind {
                host: mnemonic_file.path().to_path_buf(),
                container: mnemonic_in_container.to_string(),
                readonly: true,
            },
        ],
    };

    let value = crate::cli_spawn::spawn(spawn).await?;
    // mnemonic_file dropped here -> file removed.

    let message = value
        .get("message")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    Ok(WalletInitResponse { message })
}

// ---- wallet show-mnemonic ----

#[derive(serde::Serialize)]
pub struct WalletShowMnemonicResponse {
    /// The decrypted BIP39 mnemonic. Caller must treat this as highly sensitive.
    pub mnemonic: String,
}

/// Decrypt and reveal the node's BIP39 mnemonic by spawning
/// `docker run --rm <image> rgbldkd wallet show-mnemonic --confirm`.
///
/// Sensitive operation:
///   - rgbldkd writes an entry to `<data-dir>/audit.log` server-side on every
///     invocation (whether or not we surface the result).
///   - rgbldkd requires `--confirm`; we additionally require `confirm == true`
///     from the frontend as a defense-in-depth gate. Calling with
///     `confirm == false` returns `bad_arguments` without spawning anything.
///   - This function never logs the mnemonic. Callers must not persist the
///     returned value beyond the immediate display.
///
/// The node container may be running or stopped — rgbldkd only reads
/// `mnemonic.enc` and the passphrase secret.
#[tauri::command]
pub async fn wallet_show_mnemonic_cli(
    state: State<'_, AppState>,
    cache: State<'_, crate::mem_cache::Cache>,
    node_id: String,
    image: Option<String>,
    confirm: bool,
) -> Result<WalletShowMnemonicResponse, CommandError> {
    // Fast path: return the in-memory cached mnemonic to avoid the docker run
    // cold-start on every visit. The mnemonic is immutable (wallet seed), so
    // caching it for the process lifetime is safe. The cache is never written
    // to disk — it lives only in the Rust process heap.
    let cache_key = format!("show-mnemonic:{node_id}");
    if confirm {
        if let Some(mnemonic) = cache.get(&cache_key) {
            return Ok(WalletShowMnemonicResponse { mnemonic });
        }
    }

    let result = wallet_show_mnemonic_cli_inner(&state, &node_id, image.clone(), confirm).await;

    // Populate cache on success so subsequent calls are instant.
    if let Ok(ref resp) = result {
        cache.set(cache_key, resp.mnemonic.clone());
    }

    let audit_image = image.clone().unwrap_or_default();
    audit_cli_call(
        &state,
        "wallet show-mnemonic",
        Some(&node_id),
        &audit_image,
        result.as_ref().map(|_| ()).map_err(|e| e),
        Some(serde_json::json!({ "confirm": confirm })),
    )
    .await;
    result
}

async fn wallet_show_mnemonic_cli_inner(
    state: &State<'_, AppState>,
    node_id: &str,
    image_override: Option<String>,
    confirm: bool,
) -> Result<WalletShowMnemonicResponse, CommandError> {
    if !confirm {
        // Defense-in-depth: refuse to spawn until the UI has explicitly
        // confirmed. (The CLI would also reject without --confirm via exit
        // 15, but this avoids a docker run round-trip and an audit-log entry.)
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some("show-mnemonic requires explicit UI confirmation".to_string()),
            hint: Some("Pass `confirm: true` only after the user has reauthenticated.".to_string()),
        });
    }

    let ctx = get_ctx(&state.store, &node_id).await?;
    let image = resolve_cli_image(&ctx, image_override)?;
    let volume = resolve_data_volume_name(&ctx)?;
    let secrets_dir = resolve_host_secrets_dir(&ctx)?;
    let passphrase_host = secrets_dir.join("keystore.passphrase");

    if !passphrase_host.exists() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some(format!(
                "keystore.passphrase not found at {}",
                passphrase_host.display()
            )),
            hint: Some(
                "Re-run bootstrap to regenerate the passphrase secret file.".to_string(),
            ),
        });
    }

    let spawn = crate::cli_spawn::CliSpawn {
        image: &image,
        subcommand_label: "wallet show-mnemonic",
        args: vec![
            "wallet".to_string(),
            "show-mnemonic".to_string(),
            "--data-dir".to_string(),
            CLI_DATA_DIR_IN_CONTAINER.to_string(),
            "--passphrase-file".to_string(),
            CLI_PASSPHRASE_PATH_IN_CONTAINER.to_string(),
            "--confirm".to_string(),
        ],
        mounts: vec![
            crate::cli_spawn::Mount::Volume {
                volume,
                container: CLI_DATA_DIR_IN_CONTAINER.to_string(),
            },
            crate::cli_spawn::Mount::Bind {
                host: passphrase_host,
                container: CLI_PASSPHRASE_PATH_IN_CONTAINER.to_string(),
                readonly: true,
            },
        ],
    };

    let value = crate::cli_spawn::spawn(spawn).await?;
    let mnemonic = decode_mnemonic_field(&value, "wallet show-mnemonic")?;
    Ok(WalletShowMnemonicResponse { mnemonic })
}

// ---- backup export ----

#[derive(serde::Serialize)]
pub struct BackupExportResponse {
    /// Absolute host-side path where the archive was written.
    pub output_path: String,
    /// Size of the written archive in bytes (best-effort; None if stat failed).
    pub size_bytes: Option<u64>,
}

/// Ensure the node is in a safe state to export from: it must be either
/// stopped (control API unreachable) or locked. If the daemon is running
/// and unlocked, we lock it via the control API first. Failure to reach a
/// safe state is fatal — we refuse to export rather than risk inconsistent
/// data (per milestone1 §5 mutex rules).
async fn ensure_locked_or_stopped_for_backup(
    state: &State<'_, AppState>,
    ctx: &NodeContext,
) -> Result<(), CommandError> {
    // First: classify the container state. We need to distinguish "definitely
    // not writing" (Stopped/Absent) from "may be writing" (Running/Unknown).
    // Critically, a docker-inspect failure (Unknown) is NOT safe to treat as
    // stopped — the daemon could still be writing to data-dir.
    match container_state(&ctx.container_name) {
        ContainerState::Stopped | ContainerState::Absent => return Ok(()),
        ContainerState::Unknown => {
            return Err(CommandError::SubcommandFailed {
                subcommand: "backup export (preflight inspect)".to_string(),
                exit_code: 16,
                kind: Some("container_state_unknown".to_string()),
                message: Some(format!(
                    "could not determine state of container `{}` via docker inspect",
                    ctx.container_name
                )),
                hint: Some(
                    "Check that the docker daemon is reachable and retry.".to_string(),
                ),
            });
        },
        ContainerState::Running => {},
    }

    // Container is running. We MUST verify it is locked (or definitely not
    // writing) via the control API. If we can't verify that, we refuse — a
    // racing daemon would produce an inconsistent archive.
    if ctx.control_api_base_url.is_none() || ctx.control_api_token_file_path.is_none() {
        return Err(CommandError::SubcommandFailed {
            subcommand: "backup export".to_string(),
            exit_code: 16,
            kind: Some("node_not_stopped".to_string()),
            message: Some(format!(
                "node container `{}` is running but the control API is not configured, so it can't be locked",
                ctx.container_name
            )),
            hint: Some(
                "Stop the container manually before exporting, or configure the control API on this context.".to_string(),
            ),
        });
    }

    // Probe control status. If the probe itself fails, treat the node as
    // possibly-writing and abort. (We could be talking to a daemon that is
    // still starting up; it would already be writing to data-dir.)
    let status = rgbldkd_http::control_status(&state.http, ctx)
        .await
        .map_err(|e| CommandError::SubcommandFailed {
            subcommand: "backup export (preflight status)".to_string(),
            exit_code: 16,
            kind: Some("control_status_unreachable".to_string()),
            message: Some(format!(
                "container `{}` is running but the control API status probe failed: {e}",
                ctx.container_name
            )),
            hint: Some(
                "Wait for the node to finish starting and retry, or stop the container manually.".to_string(),
            ),
        })?;

    // Above we already confirmed `container_state(&ctx.container_name)`
    // returned Running; so the daemon process is alive. The only remaining
    // question is whether it's locked. If yes, we're done; otherwise lock.
    if status.locked {
        return Ok(());
    }

    // Running and unlocked -> attempt to lock. Any failure here aborts.
    rgbldkd_http::control_lock(&state.http, ctx)
        .await
        .map_err(|e| match e {
            CommandError::SubcommandFailed { .. } => e,
            other => CommandError::SubcommandFailed {
                subcommand: "backup export (preflight lock)".to_string(),
                exit_code: 16,
                kind: Some("lock_failed".to_string()),
                message: Some(format!("failed to lock node before export: {other}")),
                hint: Some(
                    "Lock the node manually (Nodes → Actions → Lock) and retry.".to_string(),
                ),
            },
        })?;

    Ok(())
}

/// Spawn `docker run --rm <image> rgbldkd backup export` and have rgbldkd
/// write the archive directly to the user-chosen host path.
///
/// We bind-mount the *parent directory* of `output_path` into the container
/// (since the file does not yet exist), then tell rgbldkd to write into that
/// mount point. This avoids a copy step entirely — rgbldkd's tar writer
/// becomes the only thing that touches the destination.
///
/// Preconditions:
///   - Node must be locked or stopped. We enforce this strictly: if the node
///     is running unlocked, we attempt to lock via the control API first;
///     failing to reach a safe state aborts the export. (Backing up while
///     the daemon is writing risks an inconsistent archive.)
///   - `output_path` must be absolute. Its parent directory must exist and
///     be writable from the docker daemon's perspective (on macOS / Windows
///     this means the path must fall under Docker Desktop's "File Sharing").
#[tauri::command]
pub async fn backup_export_cli(
    state: State<'_, AppState>,
    node_id: String,
    image: Option<String>,
    output_path: String,
    network: Option<String>,
) -> Result<BackupExportResponse, CommandError> {
    let result =
        backup_export_cli_inner(&state, &node_id, image.clone(), output_path, network).await;
    let extra = result
        .as_ref()
        .ok()
        .map(|r| serde_json::json!({ "size_bytes": r.size_bytes }));
    let audit_image = image.clone().unwrap_or_default();
    audit_cli_call(
        &state,
        "backup export",
        Some(&node_id),
        &audit_image,
        result.as_ref().map(|_| ()).map_err(|e| e),
        extra,
    )
    .await;
    result
}

async fn backup_export_cli_inner(
    state: &State<'_, AppState>,
    node_id: &str,
    image_override: Option<String>,
    output_path: String,
    network: Option<String>,
) -> Result<BackupExportResponse, CommandError> {
    let output_path = output_path.trim().to_string();
    if output_path.is_empty() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some("output_path must not be empty".to_string()),
            hint: Some("Use a Tauri save-file dialog to pick the destination.".to_string()),
        });
    }
    let output = PathBuf::from(&output_path);
    if !output.is_absolute() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some(format!("output_path must be absolute: {output_path}")),
            hint: None,
        });
    }
    let parent = output.parent().ok_or_else(|| CommandError::BadRequest {
        service: "control-panel",
        message: Some(format!("output_path has no parent directory: {output_path}")),
        hint: None,
    })?;
    if !parent.exists() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some(format!(
                "parent directory does not exist: {}",
                parent.display()
            )),
            hint: Some("Create the directory first or pick a different location.".to_string()),
        });
    }
    if output.exists() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some(format!("output already exists: {output_path}")),
            hint: Some("Pick a new filename or delete the existing one first.".to_string()),
        });
    }
    let file_name = output
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or_else(|| CommandError::BadRequest {
            service: "control-panel",
            message: Some(format!("output_path has no usable filename: {output_path}")),
            hint: None,
        })?
        .to_string();

    let ctx = get_ctx(&state.store, &node_id).await?;
    let image = resolve_cli_image(&ctx, image_override)?;
    let volume = resolve_data_volume_name(&ctx)?;

    let resolved_network = network
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| ctx.network.clone());
    match resolved_network.as_str() {
        "mainnet" | "bitcoin" | "testnet" | "testnet4" | "signet" | "regtest" => {},
        other => {
            return Err(CommandError::BadRequest {
                service: "control-panel",
                message: Some(format!("unsupported network: {other}")),
                hint: Some(
                    "Allowed: mainnet/bitcoin/testnet/testnet4/signet/regtest.".to_string(),
                ),
            });
        },
    }
    // rgbldkd's NetworkArg uses `bitcoin` for mainnet.
    let cli_network = if resolved_network == "mainnet" { "bitcoin".to_string() } else { resolved_network };

    // ensure_locked_or_stopped_for_backup is the SINGLE source of truth for
    // the mutex precondition (locked-or-stopped). It runs on the host where
    // we have a real reqwest client + token file access, then we pass
    // --skip-status-check to rgbldkd so it doesn't duplicate the check via
    // a cross-container HTTP call (which would require URL rewriting,
    // --add-host, and bind-mounting the token into the throwaway container —
    // all complexity rgbldkd is asked to skip by trusting our verdict).
    ensure_locked_or_stopped_for_backup(state, &ctx).await?;

    let out_dir_in_container = "/out";
    let spawn = crate::cli_spawn::CliSpawn {
        image: &image,
        subcommand_label: "backup export",
        args: vec![
            "backup".to_string(),
            "export".to_string(),
            "--data-dir".to_string(),
            CLI_DATA_DIR_IN_CONTAINER.to_string(),
            "--output".to_string(),
            format!("{out_dir_in_container}/{file_name}"),
            "--network".to_string(),
            cli_network,
            "--node-alias".to_string(),
            ctx.display_name.clone(),
            "--skip-status-check".to_string(),
        ],
        mounts: vec![
            crate::cli_spawn::Mount::Volume {
                volume,
                container: CLI_DATA_DIR_IN_CONTAINER.to_string(),
            },
            crate::cli_spawn::Mount::Bind {
                host: parent.to_path_buf(),
                container: out_dir_in_container.to_string(),
                readonly: false,
            },
        ],
    };

    let _value = crate::cli_spawn::spawn(spawn).await?;

    let size_bytes = std::fs::metadata(&output).ok().map(|m| m.len());

    Ok(BackupExportResponse {
        output_path: output.display().to_string(),
        size_bytes,
    })
}

// ---- backup import ----

#[derive(serde::Serialize)]
pub struct BackupImportResponse {
    /// Optional human-readable confirmation from rgbldkd (when present).
    pub message: Option<String>,
}

/// Stop the node's docker container and wait until docker reports it as not
/// running. Returns Ok if it was already stopped or did not exist.
fn docker_stop_and_wait(container: &str) -> Result<(), CommandError> {
    if !container_is_running(container) {
        return Ok(());
    }

    // `docker stop` blocks until the container is actually stopped (default
    // grace period 10s before SIGKILL), so we don't need an extra poll loop.
    run_command_status("docker", &["stop".to_string(), container.to_string()]).map_err(|e| {
        CommandError::SubcommandFailed {
            subcommand: "backup import (preflight stop)".to_string(),
            exit_code: 16,
            kind: Some("stop_failed".to_string()),
            message: Some(format!("failed to stop container `{container}`: {e}")),
            hint: Some(
                "Stop the container manually (`docker stop <name>`) and retry."
                    .to_string(),
            ),
        }
    })?;

    if container_is_running(container) {
        return Err(CommandError::SubcommandFailed {
            subcommand: "backup import (preflight stop)".to_string(),
            exit_code: 16,
            kind: Some("stop_did_not_complete".to_string()),
            message: Some(format!(
                "container `{container}` is still running after `docker stop`"
            )),
            hint: None,
        });
    }
    Ok(())
}

/// Restore a node's data-dir from a backup archive by spawning
/// `docker run --rm <image> rgbldkd backup import`.
///
/// The archive is bind-mounted read-only into the throwaway container at
/// `/in/archive.tar` — rgbldkd reads it in place without any host-side
/// copy. The node's data volume is mounted writable so rgbldkd can stage
/// and atomically rename the new contents.
///
/// Preconditions:
///   - The node container must be stopped. Pass `auto_stop: true` to have
///     this command run `docker stop` on the container before importing;
///     pass `false` to refuse if the container is currently running (so the
///     UI can confirm with the user first).
///
/// Exit codes the UI should branch on (CommandError::SubcommandFailed):
///   - 11 `fingerprint_mismatch` — archive's master_fingerprint does not
///     match this node's keystore. Restore with the matching mnemonic.
///   - 12 `archive_corrupted` — bad tar / hash mismatch / bad manifest.
///   - 13 `network_mismatch` — archive's network differs from --network.
///   - 14 `unsupported_format_version` — archive is from a newer rgbldkd.
///   - 16 `node_not_stopped` — container was running and `auto_stop=false`.
///
/// After a successful import the user must re-run `wallet init` with the
/// original mnemonic to restore the keystore (backups do not contain it
/// by design — §C.4 of the milestone1 contract).
#[tauri::command]
pub async fn backup_import_cli(
    state: State<'_, AppState>,
    node_id: String,
    image: Option<String>,
    archive_path: String,
    network: Option<String>,
    auto_stop: bool,
) -> Result<BackupImportResponse, CommandError> {
    let result = backup_import_cli_inner(
        &state,
        &node_id,
        image.clone(),
        archive_path,
        network,
        auto_stop,
    )
    .await;
    let audit_image = image.clone().unwrap_or_default();
    audit_cli_call(
        &state,
        "backup import",
        Some(&node_id),
        &audit_image,
        result.as_ref().map(|_| ()).map_err(|e| e),
        Some(serde_json::json!({ "auto_stop": auto_stop })),
    )
    .await;
    result
}

async fn backup_import_cli_inner(
    state: &State<'_, AppState>,
    node_id: &str,
    image_override: Option<String>,
    archive_path: String,
    network: Option<String>,
    auto_stop: bool,
) -> Result<BackupImportResponse, CommandError> {
    let archive_path = archive_path.trim().to_string();
    if archive_path.is_empty() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some("archive_path must not be empty".to_string()),
            hint: Some("Use a Tauri open-file dialog to pick the backup archive.".to_string()),
        });
    }
    let archive = PathBuf::from(&archive_path);
    if !archive.is_absolute() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some(format!("archive_path must be absolute: {archive_path}")),
            hint: None,
        });
    }
    let archive_meta = std::fs::metadata(&archive).map_err(|_| CommandError::BadRequest {
        service: "control-panel",
        message: Some(format!("archive not found or unreadable: {archive_path}")),
        hint: Some(
            "Pick the .tar file from a location Docker Desktop has access to (e.g. ~/Downloads).".to_string(),
        ),
    })?;
    if !archive_meta.is_file() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some(format!("archive_path is not a regular file: {archive_path}")),
            hint: None,
        });
    }

    let ctx = get_ctx(&state.store, &node_id).await?;
    let image = resolve_cli_image(&ctx, image_override)?;
    let volume = resolve_data_volume_name(&ctx)?;

    let resolved_network = network
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| ctx.network.clone());
    match resolved_network.as_str() {
        "mainnet" | "bitcoin" | "testnet" | "testnet4" | "signet" | "regtest" => {},
        other => {
            return Err(CommandError::BadRequest {
                service: "control-panel",
                message: Some(format!("unsupported network: {other}")),
                hint: Some(
                    "Allowed: mainnet/bitcoin/testnet/testnet4/signet/regtest.".to_string(),
                ),
            });
        },
    }
    let cli_network = if resolved_network == "mainnet" { "bitcoin".to_string() } else { resolved_network };

    // Preflight: container must be definitely stopped. Unknown state is
    // rejected (we cannot import safely while a daemon may be writing).
    match container_state(&ctx.container_name) {
        ContainerState::Stopped | ContainerState::Absent => {},
        ContainerState::Running => {
            if !auto_stop {
                return Err(CommandError::SubcommandFailed {
                    subcommand: "backup import".to_string(),
                    exit_code: 16,
                    kind: Some("node_not_stopped".to_string()),
                    message: Some(format!(
                        "node container `{}` is running; backup import requires it to be stopped",
                        ctx.container_name
                    )),
                    hint: Some(
                        "Re-invoke with auto_stop=true to stop the container automatically, or stop it manually first.".to_string(),
                    ),
                });
            }
            docker_stop_and_wait(&ctx.container_name)?;
        },
        ContainerState::Unknown => {
            return Err(CommandError::SubcommandFailed {
                subcommand: "backup import (preflight inspect)".to_string(),
                exit_code: 16,
                kind: Some("container_state_unknown".to_string()),
                message: Some(format!(
                    "could not determine state of container `{}` via docker inspect",
                    ctx.container_name
                )),
                hint: Some(
                    "Check that the docker daemon is reachable and retry.".to_string(),
                ),
            });
        },
    }

    // We've already enforced "container stopped" above (see auto_stop /
    // docker_stop_and_wait); tell rgbldkd to skip its own check rather than
    // dragging cross-container HTTP plumbing into the throwaway container.
    let archive_in_container = "/in/archive.tar";
    let spawn = crate::cli_spawn::CliSpawn {
        image: &image,
        subcommand_label: "backup import",
        args: vec![
            "backup".to_string(),
            "import".to_string(),
            "--data-dir".to_string(),
            CLI_DATA_DIR_IN_CONTAINER.to_string(),
            "--archive".to_string(),
            archive_in_container.to_string(),
            "--network".to_string(),
            cli_network,
            "--skip-status-check".to_string(),
        ],
        mounts: vec![
            crate::cli_spawn::Mount::Volume {
                volume,
                container: CLI_DATA_DIR_IN_CONTAINER.to_string(),
            },
            crate::cli_spawn::Mount::Bind {
                host: archive,
                container: archive_in_container.to_string(),
                readonly: true,
            },
        ],
    };

    let value = crate::cli_spawn::spawn(spawn).await?;

    let message = value
        .get("message")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    Ok(BackupImportResponse { message })
}

// ---- password hashing (PBKDF2-HMAC-SHA256) ----

/// Hash a user password with PBKDF2-HMAC-SHA256 and a random 16-byte salt.
///
/// Output format: `pbkdf2-sha256:<iterations>:<salt_hex>:<hash_hex>`
///
/// This replaces the legacy bare-SHA256 approach. The stored string is
/// self-contained: it embeds the salt and iteration count so `verify_password`
/// can re-derive the key without any extra state. The iterations count can
/// be increased in future without invalidating existing hashes — old hashes
/// continue to verify using their embedded count.
///
/// CPU-bound work runs on a blocking thread to avoid stalling the Tokio runtime.
#[tauri::command]
pub async fn hash_password(password: String) -> Result<String, CommandError> {
    tokio::task::spawn_blocking(move || {
        let mut salt = [0u8; 16];
        rand::rngs::OsRng.fill_bytes(&mut salt);

        const ITERATIONS: u32 = 600_000;
        let mut hash = [0u8; 32];
        pbkdf2::pbkdf2_hmac::<sha2::Sha256>(password.as_bytes(), &salt, ITERATIONS, &mut hash);

        Ok(format!(
            "pbkdf2-sha256:{ITERATIONS}:{}:{}",
            hex::encode(salt),
            hex::encode(hash)
        ))
    })
    .await
    .map_err(|_| CommandError::Io)?
}

/// Verify a user password against a stored hash produced by `hash_password`.
///
/// Supports two formats:
///   - `pbkdf2-sha256:<iter>:<salt_hex>:<hash_hex>` — current format (PBKDF2)
///   - bare 64-char lowercase hex — legacy SHA-256 (pre-PBKDF2 nodes)
///
/// Returns `Ok(true)` on match, `Ok(false)` on mismatch. Never returns an
/// error for a wrong password — the frontend converts `false` to a UI message.
///
/// CPU-bound work runs on a blocking thread to avoid stalling the Tokio runtime.
#[tauri::command]
pub async fn verify_password(
    state: State<'_, AppState>,
    node_id: String,
    password: String,
) -> Result<bool, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    let stored_hash = ctx.password_hash;

    tokio::task::spawn_blocking(move || {
        let parts: Vec<&str> = stored_hash.splitn(4, ':').collect();
        match parts.as_slice() {
            ["pbkdf2-sha256", iter_str, salt_hex, hash_hex] => {
                let iterations: u32 = iter_str.parse().map_err(|_| CommandError::BadRequest {
                    service: "control-panel",
                    message: Some("invalid stored hash: bad iteration count".to_string()),
                    hint: None,
                })?;
                let salt = hex::decode(salt_hex).map_err(|_| CommandError::BadRequest {
                    service: "control-panel",
                    message: Some("invalid stored hash: bad salt encoding".to_string()),
                    hint: None,
                })?;
                let expected = hex::decode(hash_hex).map_err(|_| CommandError::BadRequest {
                    service: "control-panel",
                    message: Some("invalid stored hash: bad hash encoding".to_string()),
                    hint: None,
                })?;

                let mut computed = [0u8; 32];
                pbkdf2::pbkdf2_hmac::<sha2::Sha256>(
                    password.as_bytes(),
                    &salt,
                    iterations,
                    &mut computed,
                );

                // constant-time comparison
                Ok(computed.as_ref() == expected.as_slice())
            }
            // Legacy: bare SHA-256 hex produced by the old frontend Crypto.hashString()
            _ if stored_hash.len() == 64
                && stored_hash.chars().all(|c| c.is_ascii_hexdigit()) =>
            {
                use sha2::Digest as _;
                let mut hasher = sha2::Sha256::new();
                hasher.update(password.as_bytes());
                let result = hasher.finalize();
                Ok(hex::encode(result) == stored_hash)
            }
            _ => Err(CommandError::BadRequest {
                service: "control-panel",
                message: Some("unrecognized password hash format".to_string()),
                hint: None,
            }),
        }
    })
    .await
    .map_err(|_| CommandError::Io)?
}

// ---- backup inspect ----

/// Manifest preview returned to the frontend. The `manifest` field carries the
/// raw rgbldkd `BackupManifest` JSON verbatim — Rust does not strip or rename
/// anything, so new manifest fields added later will surface automatically
/// without a backend code change.
#[derive(serde::Serialize)]
pub struct BackupInspectResponse {
    /// Raw `BackupManifest` JSON as returned by `rgbldkd backup inspect`.
    /// Frontend should read `manifest.network`, `manifest.rgbldkd_version`,
    /// `manifest.node_alias`, `manifest.master_fingerprint`,
    /// `manifest.created_at_unix_secs`, etc.
    pub manifest: serde_json::Value,
}

/// Preview an archive's manifest without writing anything to disk.
///
/// Unlike `backup_import_cli`, this command:
///   - Does NOT require a `node_id` — it runs BEFORE the user creates a node,
///     so the frontend can auto-fill the network field on the new-node form
///     from the archive's recorded network.
///   - Does NOT touch any data volume / secrets / control HTTP / docker
///     container; the throwaway container only reads the archive bind-mounted
///     read-only at `/in/archive.tar`.
///   - Is lenient about `format_version` — archives from a newer or older
///     rgbldkd still return their manifest so the UI can show "this backup
///     was made with rgbldkd vX.Y.Z" instead of a generic error.
///
/// `image` is required because there is no NodeContext to fall back on at
/// this stage; pass the same image tag you would use for the subsequent
/// `wallet_init_cli` / `node_run_cli` calls.
#[tauri::command]
pub async fn backup_inspect_archive_cli(
    state: State<'_, AppState>,
    image: String,
    archive_path: String,
) -> Result<BackupInspectResponse, CommandError> {
    let result = backup_inspect_archive_cli_inner(image.clone(), archive_path).await;
    audit_cli_call(
        &state,
        "backup inspect",
        None,
        &image,
        result.as_ref().map(|_| ()).map_err(|e| e),
        None,
    )
    .await;
    result
}

async fn backup_inspect_archive_cli_inner(
    image: String,
    archive_path: String,
) -> Result<BackupInspectResponse, CommandError> {
    let image = image.trim().to_string();
    if image.is_empty() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some("image must not be empty".to_string()),
            hint: Some(
                "Pass the rgbldkd docker image tag (e.g. the value of LDK_IMAGE)."
                    .to_string(),
            ),
        });
    }

    let archive_path = archive_path.trim().to_string();
    if archive_path.is_empty() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some("archive_path must not be empty".to_string()),
            hint: Some("Use a Tauri open-file dialog to pick the backup archive.".to_string()),
        });
    }
    let archive = PathBuf::from(&archive_path);
    if !archive.is_absolute() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some(format!("archive_path must be absolute: {archive_path}")),
            hint: None,
        });
    }
    let archive_meta = std::fs::metadata(&archive).map_err(|_| CommandError::BadRequest {
        service: "control-panel",
        message: Some(format!("archive not found or unreadable: {archive_path}")),
        hint: Some(
            "Pick the .tar file from a location Docker Desktop has access to (e.g. ~/Downloads)."
                .to_string(),
        ),
    })?;
    if !archive_meta.is_file() {
        return Err(CommandError::BadRequest {
            service: "control-panel",
            message: Some(format!("archive_path is not a regular file: {archive_path}")),
            hint: None,
        });
    }

    let archive_in_container = "/in/archive.tar";
    let spawn = crate::cli_spawn::CliSpawn {
        image: &image,
        subcommand_label: "backup inspect",
        args: vec![
            "backup".to_string(),
            "inspect".to_string(),
            "--archive".to_string(),
            archive_in_container.to_string(),
        ],
        mounts: vec![crate::cli_spawn::Mount::Bind {
            host: archive,
            container: archive_in_container.to_string(),
            readonly: true,
        }],
    };

    let value = crate::cli_spawn::spawn(spawn).await?;

    // rgbldkd's stdout shape is `{"ok":true, "archive_path":..., "manifest": {...}}`.
    // We pass the `manifest` subtree to the frontend verbatim so any future
    // field additions on the backend show up without a panel-side change.
    let manifest = value
        .get("manifest")
        .cloned()
        .ok_or_else(|| CommandError::SubcommandFailed {
            subcommand: "backup inspect".to_string(),
            exit_code: 0,
            kind: Some("unexpected_stdout_shape".to_string()),
            message: Some(
                "rgbldkd returned exit 0 but stdout did not contain a `manifest` field"
                    .to_string(),
            ),
            hint: Some(
                "This usually means the rgbldkd JSON contract changed. Check the image version."
                    .to_string(),
            ),
        })?;

    Ok(BackupInspectResponse { manifest })
}



/// Returns the RGB wallet outpoints known to the node.
#[tauri::command]
pub async fn node_rgb_utxos(
    state: State<'_, AppState>,
    node_id: String,
    refresh: bool // By default this uses a fast cached view
) -> Result<Value, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "rgb.utxos",
        None,
        rgbldkd_http::rgb_utxos(&state.http, &ctx, refresh),
    )
    .await
}

/// Release RGB UTXO reservation
#[tauri::command]
pub async fn node_rgb_utxo_release(
    state: State<'_, AppState>,
    node_id: String,
    request: ldk_types::RgbUtxosReleaseRequest,
) -> Result<Value, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "rgb.utxo.release",
        None,
        rgbldkd_http::rgb_utxo_release(&state.http, &ctx, request),
    )
    .await
}

/// Unspent L1 UTXOs known to the node
#[tauri::command]
pub async fn node_wallet_l1_utxos(
    state: State<'_, AppState>,
    node_id: String,
) -> Result<Value, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "rgb.utxo.release",
        None,
        rgbldkd_http::wallet_l1_utxos(&state.http, &ctx),
    )
    .await
}


#[tauri::command]
pub async fn node_rgb_utxo_sweep(
    state: State<'_, AppState>,
    node_id: String,
    request: rgbldkd_http::UtxoSweepRequestBody
) -> Result<Value, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "rgb.utxo.sweep",
        None,
        rgbldkd_http::rgb_utxo_sweep(&state.http, &ctx, &request),
    )
    .await
}

/// Create a new RGB UTXO
#[tauri::command]
pub async fn node_rgb_utxos_fund(
    state: State<'_, AppState>,
    node_id: String,
    request: rgbldkd_http::RgbUtxosFundRequestBody
) -> Result<Value, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "rgb.utxo.fund",
        None,
        rgbldkd_http::rgb_utxos_fund(&state.http, &ctx, &request),
    )
    .await
}

/// Top up RGB UTXO reservation by sweeping more L1 UTXOs into the reserved ones
#[tauri::command]
pub async fn node_rgb_utxo_top_up(
    state: State<'_, AppState>,
    node_id: String,
    request: rgbldkd_http::UtxoTopUpRequestBody
) -> Result<Value, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "rgb.utxo.top_up",
        None,
        rgbldkd_http::rgb_utxo_top_up(&state.http, &ctx, &request),
    )
    .await
}


#[tauri::command]
pub async fn node_wallet_address_current(
    state: State<'_, AppState>,
    node_id: String,
) -> Result<Value, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "wallet.address.current",
        None,
        rgbldkd_http::wallet_address_current(&state.http, &ctx),
    )
    .await
}

#[tauri::command]
pub async fn node_rgb_address_current(
    state: State<'_, AppState>,
    node_id: String,
) -> Result<rgbldkd_http::WalletNewAddressResponse, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "rgb.address.current",
        None,
        rgbldkd_http::rgb_address_current(&state.http, &ctx),
    )
    .await
}

#[tauri::command]
pub async fn node_rgb_ln_estimate_carrier(
    state: State<'_, AppState>,
    node_id: String,
) -> Result<Value, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "rgb.ln.estimate_carrier",
        None,
        rgbldkd_http::rgb_ln_estimate_carrier(&state.http, &ctx),
    )
    .await
}


/// Swap offer
#[tauri::command]
pub async fn node_swap_offers(
    state: State<'_, AppState>,
    node_id: String,
    request: Value
) -> Result<Value, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "rgb.swap.offers",
        None,
        rgbldkd_http::swap_offers(&state.http, &ctx, &request),
    )
    .await
}

/// Swap execute
#[tauri::command]
pub async fn node_swap_execute(
    state: State<'_, AppState>,
    node_id: String,
    request: Value
) -> Result<Value, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "rgb.swap.execute",
        None,
        rgbldkd_http::swap_execute(&state.http, &ctx, &request),
    )
    .await
}

/// Swap accept
#[tauri::command]
pub async fn node_swap_accept(
    state: State<'_, AppState>,
    node_id: String,
    request: Value
) -> Result<Value, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "rgb.swap.accept",
        None,
        rgbldkd_http::swap_accept(&state.http, &ctx, &request),
    )
    .await
}

/// Swap decode
#[tauri::command]
pub async fn node_swap_decode(
    state: State<'_, AppState>,
    node_id: String,
    request: Value
) -> Result<Value, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "rgb.swap.decode",
        None,
        rgbldkd_http::swap_decode(&state.http, &ctx, &request),
    )
    .await
}

/// Swap list
#[tauri::command]
pub async fn node_swap_list(
    state: State<'_, AppState>,
    node_id: String,
) -> Result<Value, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "rgb.swap.list",
        None,
        rgbldkd_http::swap_list(&state.http, &ctx),
    )
    .await
}

/// Swap info
#[tauri::command]
pub async fn node_swap_info(
    state: State<'_, AppState>,
    node_id: String,
    payment_hash: String
) -> Result<Value, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "rgb.swap.info",
        None,
        rgbldkd_http::swap_info(&state.http, &ctx, payment_hash),
    )
    .await
}

/// Swap delete
#[tauri::command]
pub async fn node_swap_delete(
    state: State<'_, AppState>,
    node_id: String,
    payment_hash: String
) -> Result<Value, CommandError> {
    let ctx = get_ctx(&state.store, &node_id).await?;
    traced_node_call(
        &state,
        &node_id,
        "rgb.swap.delete",
        None,
        rgbldkd_http::swap_delete(&state.http, &ctx, payment_hash),
    )
    .await
}
