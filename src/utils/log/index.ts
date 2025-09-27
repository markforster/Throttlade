import type { LogEntry, LogLevel, RequestEnd, RequestStart } from "./logger";

export const LOG_CAP = 100;
export let LOGS: LogEntry[] = [];

export function setLogs(logs: LogEntry[]) {
  LOGS = logs;
}