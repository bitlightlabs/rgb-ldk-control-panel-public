use serde::ser::{SerializeStruct, Serializer};
use std::path::PathBuf;

#[derive(Debug, thiserror::Error, Clone)]
pub enum CommandError {
	#[error("invalid context: {field}: {message}")]
	InvalidContext {
		field: String,
		message: String,
		hint: Option<String>,
	},

	#[error("context not found: {node_id}")]
	ContextNotFound { node_id: String },

	#[error("invalid base url: {url}")]
	InvalidBaseUrl { url: String },

	#[error("control api is not configured for this context")]
	ControlApiNotConfigured,

	#[error("token file is not configured for this context")]
	TokenFileNotConfigured,

	#[error("failed to read token file: {path}")]
	TokenFileReadFailed { path: PathBuf },

	#[error("unauthorized")]
	Unauthorized {
		service: &'static str,
		message: Option<String>,
		hint: Option<String>,
	},

	#[error("forbidden")]
	Forbidden {
		service: &'static str,
		message: Option<String>,
		hint: Option<String>,
	},

	#[error("service unavailable")]
	ServiceUnavailable {
		service: &'static str,
		message: Option<String>,
		hint: Option<String>,
	},

	#[error("bad request")]
	BadRequest {
		service: &'static str,
		message: Option<String>,
		hint: Option<String>,
	},

	#[error("unexpected http status: {status}")]
	UnexpectedHttpStatus { service: &'static str, status: u16 },

	#[error("request timeout")]
	RequestTimeout {
		service: &'static str,
		message: Option<String>,
		hint: Option<String>,
	},

	#[error("http request failed")]
	HttpRequestFailed,

	#[error("node is locked")]
	NodeLocked,

	#[error("io error")]
	Io,

	#[error("external command failed")]
	ExternalCommandFailed {
		command: String,
		message: Option<String>,
		hint: Option<String>,
	},

	#[error("invalid log level: {level}")]
	InvalidLogLevel { level: String },
}

impl serde::Serialize for CommandError {
	fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
	where
		S: Serializer,
	{
		let (code, message, hint): (&str, String, Option<&str>) = match self {
			CommandError::InvalidContext {
				field,
				message,
				hint,
			} => (
				"invalid_context",
				format!("invalid context: {field}: {message}"),
				hint.as_deref(),
			),
			CommandError::ContextNotFound { node_id } => (
				"context_not_found",
				format!("context not found: {node_id}"),
				Some("Create a node context first."),
			),
			CommandError::InvalidBaseUrl { url } => (
				"invalid_base_url",
				format!("invalid base url: {url}"),
				Some("Expected e.g. http://127.0.0.1:8500/"),
			),
			CommandError::ControlApiNotConfigured => (
				"control_api_not_configured",
				"control api is not configured for this context".to_string(),
				Some("Set control_api_base_url and control_api_token_file_path."),
			),
			CommandError::TokenFileNotConfigured => (
				"token_file_not_configured",
				"token file is not configured for this context".to_string(),
				Some("Set *_token_file_path to enable bearer auth."),
			),
			CommandError::TokenFileReadFailed { path } => (
				"token_file_read_failed",
				format!("failed to read token file: {}", path.display()),
				Some("Check the file exists and is readable (suggested perms: 0600)."),
			),
			CommandError::Unauthorized {
				service,
				message,
				hint,
			} => (
				"unauthorized",
				message
					.clone()
					.unwrap_or_else(|| format!("{service} api unauthorized (401)")),
				hint.as_deref(),
			),
			CommandError::Forbidden {
				service,
				message,
				hint,
			} => (
				"forbidden",
				message
					.clone()
					.unwrap_or_else(|| format!("{service} api forbidden (403)")),
				hint.as_deref(),
			),
			CommandError::ServiceUnavailable {
				service,
				message,
				hint,
			} => (
				"service_unavailable",
				message
					.clone()
					.unwrap_or_else(|| format!("{service} api unavailable (503)")),
				hint.as_deref(),
			),
			CommandError::BadRequest {
				service,
				message,
				hint,
			} => (
				"bad_request",
				message
					.clone()
					.unwrap_or_else(|| format!("{service} api bad request (400)")),
				hint.as_deref(),
			),
			CommandError::UnexpectedHttpStatus { service, status } => (
				"unexpected_http_status",
				format!("{service} api returned unexpected status: {status}"),
				None,
			),
			CommandError::RequestTimeout {
				service,
				message,
				hint,
			} => (
				"request_timeout",
				message
					.clone()
					.unwrap_or_else(|| format!("{service} api request timed out (408)")),
				hint.as_deref(),
			),
			CommandError::HttpRequestFailed => (
				"http_request_failed",
				"http request failed".to_string(),
				Some("Check the node is running and the base url is reachable."),
			),
				CommandError::NodeLocked => (
					"node_locked",
					"node is locked".to_string(),
					Some(
						"Unlock in the app: go to Nodes → Actions → Unlock. If you don’t see updates afterwards, go to Nodes → Actions → Start events. If Unlock is disabled, edit the node context and set Control API Base URL + Token file path."
					),
				),
			CommandError::Io => ("io", "io error".to_string(), None),
			CommandError::ExternalCommandFailed {
				command,
				message,
				hint,
			} => (
				"external_command_failed",
				message
					.clone()
					.unwrap_or_else(|| format!("external command failed: {command}")),
				hint.as_deref(),
			),
			CommandError::InvalidLogLevel { level } => (
				"invalid_log_level",
				format!("invalid log level: {level}"),
				Some("Use one of: trace|debug|info|warn|error."),
			),
		};

		let mut st = serializer.serialize_struct("CommandError", 3)?;
		st.serialize_field("code", code)?;
		st.serialize_field("message", &message)?;
		st.serialize_field("hint", &hint)?;
		st.end()
	}
}
