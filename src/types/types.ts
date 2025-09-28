
// Types must exist (npm i -D @types/chrome). Ensure tsconfig includes: "types": ["chrome"]
export type Rule = {
  id: string; // stable id for edit/delete
  pattern: string; // user-entered string
  isRegex?: boolean; // true => regex mode; false/undefined => wildcard (URLPattern)
  delayMs: number; // integer ms
  method?: string; // GET/POST/... or ""
  enabled?: boolean; // default true; when false, rule is ignored
};

// Projects/domains (planning ahead). Adding types is safe and non-breaking.
export type Project = {
  id: string;
  name: string;
  enabled: boolean;
  rules: Rule[];
};

export type AppState = {
  schemaVersion: number;
  globalEnabled: boolean;
  projects: Project[];
  currentProjectId: string | null;
};


export type MessageType = "REQS_UPDATED" | "LOGS_UPDATED" | "LOGGER_CLEAR" | "REQS_GET" | "LOGGER_GET";
export type PortMessage = {
  type: MessageType;
}

export type TrackedReq = {
  id: string;
  url: string;
  path: string;
  method: string;
  throttleMs: number;
  startedAt: number;
  finishedAt?: number;
  error?: string;
};
