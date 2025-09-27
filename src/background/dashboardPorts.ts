import { dashboardPorts, pushToDashboards } from "../utils/ports";
import { LOGS, setLogs } from "../utils/log";
import { inflight, recent } from "../utils/requests";
import type { PortMessage } from "../types/types";

export function registerDashboardPorts() {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "throttlr-dashboard") return;
    dashboardPorts.add(port);
    port.postMessage({ type: "REQS_UPDATED", inflight: Array.from(inflight.values()), recent });
    port.postMessage({ type: "LOGS_UPDATED", entries: LOGS });
    port.onDisconnect.addListener(() => {
      dashboardPorts.delete(port);
    });
    port.onMessage.addListener((msg: PortMessage) => {
      if (!msg) return;
      if (msg.type === "LOGGER_CLEAR") {
        setLogs([]);
        pushToDashboards({ type: "LOGS_UPDATED", entries: LOGS });
      }
      if (msg.type === "REQS_GET") {
        port.postMessage({ type: "REQS_UPDATED", inflight: Array.from(inflight.values()), recent });
      }
      if (msg.type === "LOGGER_GET") {
        port.postMessage({ type: "LOGS_UPDATED", entries: LOGS });
      }
    });
  });
}
