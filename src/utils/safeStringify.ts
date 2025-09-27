export function safeStringify(v: any): string {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}