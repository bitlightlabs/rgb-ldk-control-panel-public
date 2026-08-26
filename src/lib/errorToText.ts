export function errorToText(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const maybe = err as { message?: string; hint?: unknown; error?: unknown; code?: unknown; status?: unknown };

    if (typeof maybe.hint === "string" && maybe.hint.startsWith("{")) {
      try {
        const obj = JSON.parse(maybe.hint);
        let msg = "";
        if (obj.error) {
          msg += obj.error;
        }
        if(obj.hint) {
          msg += ` (${obj.hint})`;
        }
        if(obj.message) {
          msg += ` (${obj.message})`;
        }
        return msg;
      } catch {
        // ignore JSON parse errors
      }
    }

    if(typeof maybe.hint === "string") {
      return maybe.hint;
    }

    if (typeof maybe.error === "string") {
      return maybe.error;
    }
    if (maybe.message) {
      return maybe.message;
    }
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
