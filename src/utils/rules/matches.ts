import { enabled, rules } from ".";

export function matches(url: string, method: string) {
  if (!enabled) return undefined;
  return rules.find(r => {
    if (r.method && r.method.toUpperCase() !== method.toUpperCase()) return false;
    return r.isRegex
      ? new RegExp(r.pattern).test(url)
      : url.includes(r.pattern);
  });
}