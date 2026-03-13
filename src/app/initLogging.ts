import { logUi } from "@/lib/commands";

declare global {
  interface Window {
    __rgbldkControlPanelLoggingInstalled?: boolean;
  }
}

function safeToJson(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: typeof value.stack === "string" ? value.stack.slice(0, 8_192) : undefined,
    };
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { value: String(value) };
  }
}

type Level = Parameters<typeof logUi>[0];

const MAX_RECENT = 50;
const RECENT_WINDOW_MS = 10_000;
const recent: Map<string, number> = new Map();

function remember(key: string) {
  recent.set(key, Date.now());
  if (recent.size <= MAX_RECENT) return;
  const entries = [...recent.entries()].sort((a, b) => a[1] - b[1]);
  for (const [k] of entries.slice(0, Math.floor(MAX_RECENT / 2))) recent.delete(k);
}

function shouldSkip(key: string): boolean {
  const last = recent.get(key);
  if (!last) return false;
  return Date.now() - last < RECENT_WINDOW_MS;
}

function fireAndForget(level: Level, message: string, context?: unknown) {
  const key = `${level}:${message}`;
  if (shouldSkip(key)) return;
  remember(key);
  void logUi(level, message, safeToJson(context)).catch(() => {});
}

export function initLogging() {
  if (typeof window === "undefined") return;
  if (window.__rgbldkControlPanelLoggingInstalled) return;
  window.__rgbldkControlPanelLoggingInstalled = true;

  window.addEventListener("error", (e) => {
    fireAndForget("error", "window.error", {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      error: safeToJson(e.error),
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    fireAndForget("error", "window.unhandledrejection", { reason: safeToJson(e.reason) });
  });

  fireAndForget("info", "ui.started", { userAgent: navigator.userAgent });
}

