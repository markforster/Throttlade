export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEntry = {
  id: string;
  ts: number; // epoch ms
  level: LogLevel;
  msg: string;
  data?: any;
  context?: string; // optional component/context hint
};

export function normalizeLogData(value: any, depth = 3): any {
  if (value == null || depth < 0) return value === undefined ? undefined : value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof URL) return value.toString();
  if (value instanceof Error) return { message: value.message, stack: value.stack };
  if (typeof Request !== "undefined" && value instanceof Request) {
    return { type: "Request", url: value.url, method: value.method, redirected: value.redirected };
  }
  if (typeof Response !== "undefined" && value instanceof Response) {
    return { type: "Response", url: value.url, status: value.status, redirected: value.redirected };
  }
  if (value instanceof ArrayBuffer) return { type: "ArrayBuffer", byteLength: value.byteLength };
  if (ArrayBuffer.isView(value)) return { type: value.constructor?.name || "TypedArray", byteLength: value.byteLength };
  if (typeof FormData !== "undefined" && value instanceof FormData) {
    const snapshot: Record<string, any> = {};
    let count = 0;
    for (const [k, v] of value.entries()) {
      if (count++ > 10) { snapshot.__truncated = true; break; }
      snapshot[k] = typeof v === "string" ? v : (v && typeof (v as any).name === "string" ? (v as any).name : String(v));
    }
    return { type: "FormData", entries: snapshot };
  }
  if (Array.isArray(value)) return value.map((item) => normalizeLogData(item, depth - 1));
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = normalizeLogData(val, depth - 1);
    }
    return out;
  }
  if (typeof value === "function") return value.name || "[fn]";
  try { return String(value); } catch { return Object.prototype.toString.call(value); }
}

// Client-side helpers: forward logs to background to avoid polluting console
function post(level: LogLevel, msg: string, data?: any, context?: string) {
  try {
    const normalized = data === undefined ? undefined : normalizeLogData(data);
    // Use callback to avoid Promise rejection when no receiver is present
    chrome.runtime?.sendMessage?.({ type: "LOGGER_LOG", level, msg, data: normalized, context }, () => {
      try { /* access lastError to silence warnings */ (chrome.runtime as any)?.lastError; } catch {}
    });
  } catch {
    // swallow
  }
}

export const Logger = {
  debug: (msg: string, data?: any, context?: string) => post("debug", msg, data, context),
  info: (msg: string, data?: any, context?: string) => post("info", msg, data, context),
  warn: (msg: string, data?: any, context?: string) => post("warn", msg, data, context),
  error: (msg: string, data?: any, context?: string) => post("error", msg, data, context),
};

// Request tracking payloads
export type RequestStart = {
  id: string;
  url: string;
  path: string;
  method: string;
  throttleMs: number;
  startedAt: number; // epoch ms
};

export type RequestEnd = {
  id: string;
  finishedAt: number; // epoch ms
  error?: string;
};
