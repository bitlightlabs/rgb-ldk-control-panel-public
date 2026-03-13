export function errorToText(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const maybe = err as { message?: unknown; hint?: unknown; error?: unknown; code?: unknown; status?: unknown };
    if (typeof maybe.message === "string") {
      if (typeof maybe.hint === "string" && maybe.hint.trim()) {
        return `${maybe.message} (hint: ${maybe.hint})`;
      }
      return maybe.message;
    }
    if (typeof maybe.error === "string") {
      return maybe.error;
    }
    if (typeof maybe.code === "string") {
      return `Error: ${maybe.code}`;
    }
    if (typeof maybe.status === "number") {
      return `HTTP ${maybe.status}`;
    }
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
