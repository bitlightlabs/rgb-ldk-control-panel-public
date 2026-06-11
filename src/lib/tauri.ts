import { invoke } from "@tauri-apps/api/core";
import { errorToText } from "./errorToText";

type InvokeTimingLogContext = {
  command: string;
  startedAtMs: number;
  startedAtIso: string;
  finishedAtMs?: number;
  finishedAtIso?: string;
  durationSeconds?: number;
  ok: boolean;
  error?: string;
};

const INVOKE_TIMING_SKIP_COMMANDS = new Set([
  "log_ui",
  "node_main_readyz",
  "node_main_healthz",
]);

function shouldSkipInvokeTiming(command: string): boolean {
  return INVOKE_TIMING_SKIP_COMMANDS.has(command);
}

function formatInvokeError(error: unknown): string {
  const text = errorToText(error);
  if (text !== "[object Object]") return text;

  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      // Fall through to String(error).
    }
  }

  return String(error);
}

function writeInvokeTimingToConsole(message: string, context: InvokeTimingLogContext): void {
  if (shouldSkipInvokeTiming(context.command)) return;

  const prefix = `[tauri] ${message} ${context.command}`;
  if (message === "tauri.invoke.start") {
    console.debug(prefix, {
      startedAtMs: context.startedAtMs,
      startedAtIso: context.startedAtIso,
    });
    return;
  }

  const payload = {
    startedAtMs: context.startedAtMs,
    startedAtIso: context.startedAtIso,
    finishedAtMs: context.finishedAtMs,
    finishedAtIso: context.finishedAtIso,
    durationSeconds: context.durationSeconds,
    ok: context.ok,
    error: context.error,
  };

  if (context.ok) {
    console.debug(prefix, payload);
    return;
  }

  console.error(prefix, payload);
}

async function logInvokeTiming(message: string, context: InvokeTimingLogContext): Promise<void> {
  if (shouldSkipInvokeTiming(context.command)) return;

  writeInvokeTimingToConsole(message, context);

  const level = message === "tauri.invoke.finish" && !context.ok ? "error" : "debug";

  try {
    await invoke("log_ui", {
      level,
      message,
      context,
    });
  } catch {
    // Ignore logging failures so command execution is never blocked by metrics.
  }
}

export async function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const startedAtMs = Date.now();
  const startedAtIso = new Date(startedAtMs).toISOString();

  await logInvokeTiming("tauri.invoke.start", {
    command,
    startedAtMs,
    startedAtIso,
    ok: true,
  });

  try {
    const result = await invoke<T>(command, args);
    const finishedAtMs = Date.now();
    const durationSeconds = Number(((finishedAtMs - startedAtMs) / 1000).toFixed(3));

    await logInvokeTiming("tauri.invoke.finish", {
      command,
      startedAtMs,
      startedAtIso,
      finishedAtMs,
      finishedAtIso: new Date(finishedAtMs).toISOString(),
      durationSeconds,
      ok: true,
    });

    return result;
  } catch (error) {
    const finishedAtMs = Date.now();
    const durationSeconds = Number(((finishedAtMs - startedAtMs) / 1000).toFixed(3));

    await logInvokeTiming("tauri.invoke.finish", {
      command,
      startedAtMs,
      startedAtIso,
      finishedAtMs,
      finishedAtIso: new Date(finishedAtMs).toISOString(),
      durationSeconds,
      ok: false,
      error: formatInvokeError(error),
    });

    throw error;
  }
}

