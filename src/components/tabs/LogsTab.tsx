import { LogLevel } from "esbuild";
import React from "react";
import { Card, Button, Badge } from "react-bootstrap";
import { LogEntry } from "../../utils/log/logger";
import { safeStringify } from "../../utils/safeStringify";

export default function LogsTab() {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);

  React.useEffect(() => {
    const port = chrome.runtime.connect({ name: "throttlr-dashboard" });
    const onMessage = (msg: any) => {
      if (msg?.type === "LOGS_UPDATED") setLogs(Array.isArray(msg.entries) ? msg.entries : []);
    };
    port.onMessage.addListener(onMessage);
    port.postMessage({ type: "LOGGER_GET" });
    return () => {
      try { port.onMessage.removeListener(onMessage); port.disconnect(); } catch { }
    };
  }, []);

  const levelVariant = (lvl: string) => {
    switch (lvl)
    {
      case "debug": return 'secondary';
      case "info": return 'primary';
      case "warning": return 'warning';
      case "error": return 'danger';
      default: return 'secondary';
    }
  };

  const clear = () => {
    try { chrome.runtime.sendMessage({ type: "LOGGER_CLEAR" }); } catch { }
  };

  return (
    <Card className="mt-3">
      <Card.Body>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <Card.Title as="h2" className="h6 mb-0">Logs (latest 100)</Card.Title>
          <Button size="sm" variant="outline-secondary" onClick={clear}>Clear</Button>
        </div>
        {logs.length === 0 ? (
          <div className="text-muted">No logs</div>
        ) : (
          <div className="small" style={{ maxHeight: 360, overflowY: 'auto' }}>
            {logs.slice().reverse().map(l => (
              <div key={l.id} className="d-flex align-items-start gap-2 py-1 border-bottom">
                <Badge bg={levelVariant(l.level)}>{l.level}</Badge>
                <div className="text-muted" style={{ minWidth: 120 }}>
                  {new Date(l.ts).toLocaleTimeString()}
                </div>
                <div className="flex-grow-1">
                  <div className="fw-semibold">{l.msg}</div>
                  {l.data ? (
                    <pre className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>{safeStringify(l.data)}</pre>
                  ) : null}
                  {l.context ? (
                    <div className="text-muted">{l.context}</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}