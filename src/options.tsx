import React from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";

type Rule = {
  id: string;
  pattern: string;
  isRegex?: boolean;
  delayMs: number;
  method?: string;
};

function useStorageRules() {
  const [rules, setRules] = React.useState<Rule[]>([]);
  React.useEffect(() => {
    chrome.storage.sync.get("rules").then(({ rules }) => setRules(rules ?? []));
    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "sync" && changes.rules)
      {
        setRules(changes.rules.newValue ?? []);
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);
  const save = (next: Rule[]) => chrome.storage.sync.set({ rules: next });
  return { rules, setRules, save };
}

function Popup() {
  const { rules, save } = useStorageRules();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pattern = String(fd.get("pattern") ?? "").trim();
    const delayMs = Number(fd.get("delayMs") ?? 0);
    const method = String(fd.get("method") ?? "").toUpperCase() || undefined;
    const isRegex = fd.get("mode") === "regex";
    if (!pattern) return;

    const next: Rule = {
      id: crypto.randomUUID(),
      pattern,
      isRegex,
      delayMs: Math.max(0, Math.round(delayMs)),
      method
    };
    save([next, ...rules]);
    e.currentTarget.reset();
  };

  const remove = (id: string) => save(rules.filter(r => r.id !== id));

  return (
    <div>
      <h1>Throttlr</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
        <input name="pattern" placeholder="/api/* or ^https://api\\.site\\.com" required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", gap: 8 }}>
          <select name="method" defaultValue="">
            <option value="">Any</option>
            <option>GET</option><option>POST</option><option>PUT</option>
            <option>PATCH</option><option>DELETE</option>
          </select>
          <input name="delayMs" type="number" min={0} step={50} defaultValue={2000} />
          <select name="mode" defaultValue="pattern">
            <option value="pattern">Wildcard</option>
            <option value="regex">Regex</option>
          </select>
        </div>
        <button type="submit">Add Rule</button>
      </form>

      <hr style={{ margin: "12px 0" }} />

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Rule</th>
            <th style={{ textAlign: "right" }}>Delay</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rules.map(r => (
            <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>
                <div><strong>{r.pattern}</strong></div>
                <div style={{ color: "#666", fontSize: 12 }}>
                  {r.method ? <span>[{r.method}] </span> : null}
                  {r.isRegex ? "regex" : "wildcard"}
                </div>
              </td>
              <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{r.delayMs} ms</td>
              <td style={{ textAlign: "right" }}>
                <button type="button" onClick={() => remove(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {rules.length === 0 && (
            <tr><td colSpan={3} style={{ color: "#666" }}>No rules yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
