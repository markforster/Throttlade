import React from "react";
import { Badge, ProgressBar, Card } from "react-bootstrap";
import { TrackedReq } from "../../types/types";
import { methodVariant } from "../../utils/rules-ui";

export default function RequestsTab() {
  const [inflight, setInflight] = React.useState<TrackedReq[]>([]);
  const [recent, setRecent] = React.useState<TrackedReq[]>([]);
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    const port = chrome.runtime.connect({ name: "throttlr-dashboard" });
    const onMessage = (msg: any) => {
      if (msg?.type === "REQS_UPDATED")
      {
        setInflight(Array.isArray(msg.inflight) ? msg.inflight : []);
        setRecent(Array.isArray(msg.recent) ? msg.recent : []);
      }
    };
    port.onMessage.addListener(onMessage);
    port.postMessage({ type: "REQS_GET" });
    const iv = setInterval(() => setTick(v => (v + 1) & 1023), 100);
    return () => {
      try { port.onMessage.removeListener(onMessage); port.disconnect(); } catch { }
      clearInterval(iv);
    };
  }, []);

  const now = Date.now();

  const renderRow = (r: TrackedReq, done: boolean) => {
    const pct = done ? 100 : Math.max(0, Math.min(100, r.throttleMs > 0 ? ((now - r.startedAt) / r.throttleMs) * 100 : 0));
    const label = done ? "Done" : `${Math.min(100, Math.max(0, pct)).toFixed(0)}%`;
    return (
      <div key={r.id} className={`d-flex align-items-center justify-content-between py-2 ${done ? 'text-muted' : ''}`}>
        <div className="me-3 text-truncate" style={{ minWidth: 140 }}>
          <Badge bg={methodVariant(r.method)} className="me-2">{r.method}</Badge>
          <span title={r.url} className="text-truncate d-inline-block" style={{ maxWidth: 360 }}>{r.path || r.url}</span>
        </div>
        <div className="flex-grow-1">
          <ProgressBar now={pct} label={label} style={{ height: 18 }} variant={done ? 'success' : undefined} animated={!done} />
        </div>
      </div>
    );
  };

  return (
    <Card className="mt-3">
      <Card.Body>
        <Card.Title as="h2" className="h6 mb-3">In-flight</Card.Title>
        {inflight.length === 0 ? (
          <div className="text-muted">No active requests</div>
        ) : inflight.map(r => renderRow(r, false))}

        <hr />
        <Card.Title as="h2" className="h6 mb-3">Recent (last 50)</Card.Title>
        {recent.length === 0 ? (
          <div className="text-muted">No recent requests</div>
        ) : recent.map(r => renderRow(r, true))}
      </Card.Body>
    </Card>
  );
}