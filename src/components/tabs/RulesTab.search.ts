import type { Rule } from "../../types/types";

export type SearchToken = {
  value: string;
  negate: boolean;
};

export function parseSearchTokens(input: string): SearchToken[] {
  if (!input.trim()) return [];
  const tokens: SearchToken[] = [];
  const regex = /"([^"]+)"|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    const raw = match[1] ?? match[2] ?? "";
    if (!raw) continue;
    const negate = raw.startsWith("-");
    const value = negate ? raw.slice(1) : raw;
    const normalized = value.trim().toLowerCase();
    if (!normalized) continue;
    tokens.push({ value: normalized, negate });
  }
  return tokens;
}

export function matchesSearch(rule: Rule, tokens: SearchToken[]): boolean {
  if (tokens.length === 0) return true;
  const haystack = buildHaystack(rule);
  for (const token of tokens) {
    const hit = haystack.some((field) => field.includes(token.value));
    if (token.negate) {
      if (hit) return false;
    } else {
      if (!hit) return false;
    }
  }
  return true;
}

function buildHaystack(rule: Rule): string[] {
  const parts: string[] = [];
  const pattern = (rule.pattern || "").toLowerCase();
  if (pattern) parts.push(pattern);
  const method = (rule.method || "Any").toLowerCase();
  parts.push(method);
  const mode = rule.isRegex ? "regex" : "wildcard";
  parts.push(mode);
  return parts;
}

