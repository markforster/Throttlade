
// Types must exist (npm i -D @types/chrome). Ensure tsconfig includes: "types": ["chrome"]
export type Rule = {
  id: string; // stable id for edit/delete
  pattern: string; // user-entered string
  isRegex?: boolean; // true => regex mode; false/undefined => wildcard (URLPattern)
  delayMs: number; // integer ms
  method?: string; // GET/POST/... or ""
};
