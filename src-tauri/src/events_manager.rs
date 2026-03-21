use crate::context_store::NodeContext;
use crate::error::CommandError;
use crate::logger::{now_ms, FileLogger, LogEntry, LogLevel};
use crate::rgbldkd_http;
use crate::rgbldkd_http::EventDto;
use serde::Serialize;
use std::sync::Arc;
use std::collections::{HashMap, VecDeque};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::sync::{Mutex, watch};

#[derive(Debug, Clone, Serialize)]
pub struct StoredEvent {
	pub node_id: String,
	pub received_at_ms: u64,
	pub event: EventDto,
}

#[derive(Debug, Clone, Serialize)]
pub struct EventsStatus {
	pub running: bool,
	pub last_error: Option<CommandError>,
}

struct TaskHandle {
	stop_tx: watch::Sender<bool>,
	join: tokio::task::JoinHandle<()>,
}

pub struct EventsManager {
	tasks: Mutex<HashMap<String, TaskHandle>>,
	buffers: Arc<Mutex<HashMap<String, VecDeque<StoredEvent>>>>,
	status: Arc<Mutex<HashMap<String, EventsStatus>>>,
}

impl EventsManager {
	pub fn new() -> Self {
		Self {
			tasks: Mutex::new(HashMap::new()),
			buffers: Arc::new(Mutex::new(HashMap::new())),
			status: Arc::new(Mutex::new(HashMap::new())),
		}
	}

	pub async fn start_for_context(
		&self,
		app: AppHandle,
		http: reqwest::Client,
		ctx: NodeContext,
		logger: FileLogger,
	) -> Result<(), CommandError> {
		let node_id = ctx.node_id.clone();
		let node_id_for_task = node_id.clone();
		let mut tasks = self.tasks.lock().await;
		if tasks.contains_key(&node_id) {
			return Ok(());
		}

		let (stop_tx, mut stop_rx) = watch::channel(false);
		let manager = self.clone_for_task();

		let join = tokio::spawn(async move {
			let _ = logger
				.append(LogEntry {
					ts_ms: now_ms(),
					source: "backend".to_string(),
					level: LogLevel::Info,
					message: "events.loop_started".to_string(),
					context: Some(serde_json::json!({ "node_id": node_id_for_task.clone() })),
				})
				.await;

			manager.set_status_running(&node_id_for_task, true).await;
			manager.set_status_error(&node_id_for_task, None).await;

			let mut backoff_ms: u64 = 250;
			let mut last_err_key: Option<(String, u64)> = None;

			loop {
				if *stop_rx.borrow() {
					break;
				}

				let wait_started = now_ms();
				manager
					.push_event(StoredEvent {
						node_id: node_id_for_task.clone(),
						received_at_ms: wait_started,
						event: EventDto::NodeHttp {
							action: "events.wait_next".to_string(),
							phase: "request".to_string(),
							duration_ms: None,
							request: None,
							response: None,
							error: None,
						},
					})
					.await;

				let wait_fut = rgbldkd_http::events_wait_next(&http, &ctx);
				let ev = tokio::select! {
					_ = stop_rx.changed() => {
						continue;
					}
					res = wait_fut => res,
				};

				let ev = match ev {
					Ok(v) => {
						manager
							.push_event(StoredEvent {
								node_id: node_id_for_task.clone(),
								received_at_ms: now_ms(),
								event: EventDto::NodeHttp {
									action: "events.wait_next".to_string(),
									phase: "response".to_string(),
									duration_ms: Some(now_ms().saturating_sub(wait_started)),
									request: None,
									response: None,
									error: None,
								},
							})
							.await;
						backoff_ms = 250;
						v
					}
					Err(e) => {
						manager
							.push_event(StoredEvent {
								node_id: node_id_for_task.clone(),
								received_at_ms: now_ms(),
								event: EventDto::NodeHttp {
									action: "events.wait_next".to_string(),
									phase: "error".to_string(),
									duration_ms: Some(now_ms().saturating_sub(wait_started)),
									request: None,
									response: None,
									error: serde_json::to_value(&e).ok(),
								},
							})
							.await;
						manager
							.set_status_error(&node_id_for_task, Some(e.clone()))
							.await;
						let op = "events.wait_next";
						let key = format!("{op}:{e}");
						let now = now_ms();
						let should_log = match &last_err_key {
							Some((prev, ts)) if prev == &key && now.saturating_sub(*ts) < 5_000 => false,
							_ => true,
						};
						if should_log {
							last_err_key = Some((key, now));
							let err_json = serde_json::to_value(&e).ok();
							let _ = logger
								.append(LogEntry {
									ts_ms: now,
									source: "backend".to_string(),
									level: LogLevel::Warn,
									message: format!("{op} failed"),
									context: Some(serde_json::json!({
										"node_id": node_id_for_task.clone(),
										"backoff_ms": backoff_ms,
										"error": err_json
									})),
								})
								.await;
						}
						let should_stop = matches!(
							e,
							CommandError::Unauthorized { .. }
								| CommandError::Forbidden { .. }
								| CommandError::TokenFileNotConfigured
								| CommandError::TokenFileReadFailed { .. }
								| CommandError::InvalidBaseUrl { .. }
								| CommandError::InvalidContext { .. }
								| CommandError::ControlApiNotConfigured
						);
						if should_stop {
							break;
						}
						tokio::time::sleep(std::time::Duration::from_millis(backoff_ms)).await;
						backoff_ms = (backoff_ms * 2).min(15_000);
						continue;
					}
				};

				let received_at_ms = SystemTime::now()
					.duration_since(UNIX_EPOCH)
					.map(|d| d.as_millis() as u64)
					.unwrap_or(0);

				let stored = StoredEvent {
					node_id: node_id_for_task.clone(),
					received_at_ms,
					event: ev.clone(),
				};
				manager.push_event(stored.clone()).await;
				let _ = app.emit("rgbldk:node_event", stored);

				let handled_started = now_ms();
				manager
					.push_event(StoredEvent {
						node_id: node_id_for_task.clone(),
						received_at_ms: handled_started,
						event: EventDto::NodeHttp {
							action: "events.handled".to_string(),
							phase: "request".to_string(),
							duration_ms: None,
							request: None,
							response: None,
							error: None,
						},
					})
					.await;

				match rgbldkd_http::events_handled(&http, &ctx).await {
					Err(e) => {
						manager
							.push_event(StoredEvent {
								node_id: node_id_for_task.clone(),
								received_at_ms: now_ms(),
								event: EventDto::NodeHttp {
									action: "events.handled".to_string(),
									phase: "error".to_string(),
									duration_ms: Some(now_ms().saturating_sub(handled_started)),
									request: None,
									response: None,
									error: serde_json::to_value(&e).ok(),
								},
							})
							.await;
						manager
							.set_status_error(&node_id_for_task, Some(e.clone()))
							.await;
						let op = "events.handled";
						let key = format!("{op}:{e}");
						let now = now_ms();
						let should_log = match &last_err_key {
							Some((prev, ts)) if prev == &key && now.saturating_sub(*ts) < 5_000 => false,
							_ => true,
						};
						if should_log {
							last_err_key = Some((key, now));
							let err_json = serde_json::to_value(&e).ok();
							let _ = logger
								.append(LogEntry {
									ts_ms: now,
									source: "backend".to_string(),
									level: LogLevel::Warn,
									message: format!("{op} failed"),
									context: Some(serde_json::json!({
										"node_id": node_id_for_task.clone(),
										"backoff_ms": backoff_ms,
										"error": err_json
									})),
								})
								.await;
						}
						let should_stop = matches!(
							e,
							CommandError::Unauthorized { .. }
								| CommandError::Forbidden { .. }
								| CommandError::TokenFileNotConfigured
								| CommandError::TokenFileReadFailed { .. }
						);
						if should_stop {
							break;
						}
						tokio::time::sleep(std::time::Duration::from_millis(backoff_ms)).await;
						backoff_ms = (backoff_ms * 2).min(15_000);
					}
					Ok(()) => {
						manager
							.push_event(StoredEvent {
								node_id: node_id_for_task.clone(),
								received_at_ms: now_ms(),
								event: EventDto::NodeHttp {
									action: "events.handled".to_string(),
									phase: "response".to_string(),
									duration_ms: Some(now_ms().saturating_sub(handled_started)),
									request: None,
									response: None,
									error: None,
								},
							})
							.await;
					}
				}
			}

			manager.set_status_running(&node_id_for_task, false).await;
			let _ = logger
				.append(LogEntry {
					ts_ms: now_ms(),
					source: "backend".to_string(),
					level: LogLevel::Info,
					message: "events.loop_stopped".to_string(),
					context: Some(serde_json::json!({ "node_id": node_id_for_task.clone() })),
				})
				.await;
		});

		tasks.insert(node_id, TaskHandle { stop_tx, join });
		Ok(())
	}

	pub async fn stop(&self, node_id: &str) -> Result<(), CommandError> {
		let mut tasks = self.tasks.lock().await;
		let Some(handle) = tasks.remove(node_id) else {
			return Ok(());
		};
		let _ = handle.stop_tx.send(true);
		let _ = handle.join.await;
		Ok(())
	}

	pub async fn list(&self, node_id: &str, limit: usize) -> Vec<StoredEvent> {
		let buffers = self.buffers.lock().await;
		let Some(buf) = buffers.get(node_id) else {
			return vec![];
		};
		let mut out = buf.iter().cloned().collect::<Vec<_>>();
		out.reverse();
		out.truncate(limit);
		out
	}

	pub async fn clear(&self, node_id: &str) {
		let mut buffers = self.buffers.lock().await;
		buffers.remove(node_id);
	}

	pub async fn push_external_event(&self, node_id: &str, event: EventDto) {
		let received_at_ms = SystemTime::now()
			.duration_since(UNIX_EPOCH)
			.map(|d| d.as_millis() as u64)
			.unwrap_or(0);
		let stored = StoredEvent {
			node_id: node_id.to_string(),
			received_at_ms,
			event,
		};
		let manager = self.clone_for_task();
		manager.push_event(stored).await;
	}

	pub async fn status(&self, node_id: &str) -> EventsStatus {
		let st = self.status.lock().await;
		st.get(node_id)
			.cloned()
			.unwrap_or(EventsStatus {
				running: false,
				last_error: None,
			})
	}

	pub async fn status_all(&self) -> HashMap<String, EventsStatus> {
		self.status.lock().await.clone()
	}

	fn clone_for_task(&self) -> EventsManagerRef {
		EventsManagerRef {
			buffers: Arc::clone(&self.buffers),
			status: Arc::clone(&self.status),
		}
	}
}

#[derive(Clone)]
struct EventsManagerRef {
	buffers: Arc<Mutex<HashMap<String, VecDeque<StoredEvent>>>>,
	status: Arc<Mutex<HashMap<String, EventsStatus>>>,
}

impl EventsManagerRef {
	async fn push_event(&self, ev: StoredEvent) {
		const MAX_EVENTS_PER_NODE: usize = 500;
		let mut buffers = self.buffers.lock().await;
		let buf = buffers.entry(ev.node_id.clone()).or_insert_with(VecDeque::new);
		buf.push_back(ev);
		while buf.len() > MAX_EVENTS_PER_NODE {
			buf.pop_front();
		}
	}

	async fn set_status_running(&self, node_id: &str, running: bool) {
		let mut st = self.status.lock().await;
		let entry = st.entry(node_id.to_string()).or_insert(EventsStatus {
			running,
			last_error: None,
		});
		entry.running = running;
	}

	async fn set_status_error(&self, node_id: &str, err: Option<CommandError>) {
		let mut st = self.status.lock().await;
		let entry = st.entry(node_id.to_string()).or_insert(EventsStatus {
			running: false,
			last_error: None,
		});
		entry.last_error = err;
	}
}
