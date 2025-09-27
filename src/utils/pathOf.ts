export function pathOf(u: string): string {
  try { return new URL(u, document.baseURI).pathname || u; } catch { return u; }
}