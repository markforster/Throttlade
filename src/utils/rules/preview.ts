import type { Rule } from "../../types/types";

export type MatchResult = { index: number; rule: Rule } | null;

export function normalizeMethod(m?: string): string {
  return (m || "").trim().toUpperCase();
}

export function methodCovers(ruleMethod?: string, reqMethod?: string): boolean {
  const r = normalizeMethod(ruleMethod);
  const m = normalizeMethod(reqMethod);
  if (!r) return true; // Any
  if (!m) return false; // request unspecified shouldn't happen; treat as no
  return r === m;
}

export function testPattern(rule: Rule, url: string): boolean {
  if (rule.isRegex) {
    try {
      return new RegExp(rule.pattern).test(url);
    } catch {
      return false;
    }
  }
  return url.includes(rule.pattern || "");
}

export function getFirstMatch(rules: Rule[], url: string, method: string): MatchResult {
  const m = normalizeMethod(method || "GET");
  const u = url || "";
  const winner = rules.find((r) => methodCovers(r.method, m) && testPattern(r, u));
  if (!winner) return null;
  const index = rules.findIndex((r) => r.id === winner.id);
  return index >= 0 ? { index, rule: winner } : null;
}

export type EvalStep = { idx: number; methodOk: boolean; patternOk: boolean; error?: string };

export function getEvaluationPath(rules: Rule[], url: string, method: string): EvalStep[] {
  const steps: EvalStep[] = [];
  const m = normalizeMethod(method || "GET");
  const u = url || "";
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    const idx = i + 1;
    const methodOk = methodCovers(r.method, m);
    if (!methodOk) { steps.push({ idx, methodOk, patternOk: false }); continue; }
    if (r.isRegex) {
      try {
        const ok = new RegExp(r.pattern).test(u);
        steps.push({ idx, methodOk, patternOk: ok });
        if (ok) break;
      } catch {
        steps.push({ idx, methodOk, patternOk: false, error: "invalid regex" });
      }
    } else {
      const ok = u.includes(r.pattern || "");
      steps.push({ idx, methodOk, patternOk: ok });
      if (ok) break;
    }
  }
  return steps;
}

