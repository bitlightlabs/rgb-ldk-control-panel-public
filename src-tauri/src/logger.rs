use crate::error::CommandError;
use serde::Serialize;
use serde_json::Value;
use std::cmp::min;
use std::io::{Read, Seek};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::Mutex;
use crate::app_dirs;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
	Trace,
	Debug,
	Info,
	Warn,
	Error,
}

impl LogLevel {
	pub fn parse(s: &str) -> Option<Self> {
		match s.trim().to_ascii_lowercase().as_str() {
			"trace" => Some(Self::Trace),
			"debug" => Some(Self::Debug),
			"info" => Some(Self::Info),
			"warn" | "warning" => Some(Self::Warn),
			"error" => Some(Self::Error),
			_ => None,
		}
	}
}

#[derive(Debug, Clone, Serialize)]
pub struct LogEntry {
	pub ts_ms: u64,
	pub source: String, // "ui" | "backend"
	pub level: LogLevel,
	pub message: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub context: Option<Value>,
}

#[derive(Clone)]
pub struct FileLogger {
	path: PathBuf,
	lock: Arc<Mutex<()>>,
}

impl FileLogger {
	pub fn new_default() -> Result<Self, CommandError> {
		let dir = app_dirs::data_dir()?.join("logs");
		let path = dir.join("control-panel.jsonl");
		Ok(Self {
			path,
			lock: Arc::new(Mutex::new(())),
		})
	}

	pub fn path(&self) -> &Path {
		&self.path
	}

	pub async fn append(&self, mut entry: LogEntry) -> Result<(), CommandError> {
		entry.message = entry.message.trim().to_string();
		if entry.message.is_empty() {
			return Ok(());
		}
		if entry.message.len() > 8_192 {
			entry.message.truncate(8_192);
		}
		entry.context = entry.context.map(scrub_json);

		let _g = self.lock.lock().await;
		if let Some(parent) = self.path.parent() {
			std::fs::create_dir_all(parent).map_err(|_| CommandError::Io)?;
		}
		let mut f = std::fs::OpenOptions::new()
			.create(true)
			.append(true)
			.open(&self.path)
			.map_err(|_| CommandError::Io)?;

		let line = serde_json::to_string(&entry).map_err(|_| CommandError::Io)?;
		f.write_all(line.as_bytes()).map_err(|_| CommandError::Io)?;
		f.write_all(b"\n").map_err(|_| CommandError::Io)?;
		Ok(())
	}

	pub async fn tail_lines(&self, limit: usize) -> Result<Vec<String>, CommandError> {
		let limit = limit.clamp(1, 2_000);

		let _g = self.lock.lock().await;
		let mut f = match std::fs::File::open(&self.path) {
			Ok(f) => f,
			Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(vec![]),
			Err(_) => return Err(CommandError::Io),
		};

		let meta = f.metadata().map_err(|_| CommandError::Io)?;
		let mut pos = meta.len();
		if pos == 0 {
			return Ok(vec![]);
		}

		let mut parts: Vec<Vec<u8>> = Vec::new();
		let mut newlines: usize = 0;
		let mut chunk = vec![0u8; 8 * 1024];

		while pos > 0 && newlines <= limit {
			let read_len = min(chunk.len() as u64, pos) as usize;
			pos -= read_len as u64;
			f.seek(std::io::SeekFrom::Start(pos)).map_err(|_| CommandError::Io)?;
			f.read_exact(&mut chunk[..read_len]).map_err(|_| CommandError::Io)?;
			newlines += chunk[..read_len].iter().filter(|&&b| b == b'\n').count();
			parts.push(chunk[..read_len].to_vec());
		}

		parts.reverse();
		let data = parts.concat();
		let text = String::from_utf8_lossy(&data);
		let lines: Vec<&str> = text.lines().collect();
		let start = lines.len().saturating_sub(limit);
		Ok(lines[start..].iter().map(|s| s.to_string()).collect())
	}
}

pub fn now_ms() -> u64 {
	SystemTime::now()
		.duration_since(UNIX_EPOCH)
		.map(|d| d.as_millis() as u64)
		.unwrap_or(0)
}

fn scrub_json(v: Value) -> Value {
	match v {
		Value::Object(mut m) => {
			for (k, vv) in m.iter_mut() {
				if looks_sensitive_key(k) {
					*vv = Value::String("<redacted>".to_string());
				} else {
					let taken = std::mem::take(vv);
					*vv = scrub_json(taken);
				}
			}
			Value::Object(m)
		}
		Value::Array(mut a) => {
			for vv in a.iter_mut() {
				let taken = std::mem::take(vv);
				*vv = scrub_json(taken);
			}
			Value::Array(a)
		}
		other => other,
	}
}

fn looks_sensitive_key(k: &str) -> bool {
	let k = k.trim().to_ascii_lowercase();
	k.contains("authorization")
		|| k.contains("token")
		|| k.contains("passphrase")
		|| k.contains("secret")
		|| k.contains("password")
}
