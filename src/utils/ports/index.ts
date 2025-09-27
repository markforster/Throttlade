import { LOGS, LOG_CAP, setLogs } from "../log";
import { LogEntry, LogLevel } from "../log/logger";

export const dashboardPorts = new Set<chrome.runtime.Port>();

export function pushToDashboards(message: any) {
  for (const port of dashboardPorts) {
    try { port.postMessage(message); } catch {}
  }
}

export function bgLog(level: LogLevel, msg: string, data?: any, context?: string) {
  const entry: LogEntry = {
    id: Math.random().toString(36).slice(2),
    ts: Date.now(),
    level,
    msg,
    data,
    context,
  };
  LOGS.push(entry);
  if (LOGS.length > LOG_CAP) setLogs(LOGS.slice(LOGS.length - LOG_CAP));
  pushToDashboards({ type: "LOGS_UPDATED", entries: LOGS });
}