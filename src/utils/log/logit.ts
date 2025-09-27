import { normalizeLogData } from "./logger";

export function log(level: "debug" | "info" | "warn" | "error", msg: string, data?: any) {
  try
  {
    const payload = data === undefined ? undefined : normalizeLogData(data);
    window.postMessage({ __THROTTLR__: true, type: "LOG", level, msg, data: payload, context: "inpage" }, "*");
  } catch { }
}
