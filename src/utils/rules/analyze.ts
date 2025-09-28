import type { Rule } from "../../types/types";

export type ConflictKind = "definite" | "possible";

export type ConflictDetail = {
  blockerId: string;
  blockerIndex: number;
  kind: ConflictKind;
  method: string; // "Any" or uppercased method
  detail: string;
};

export type RuleConflict = {
  ruleId: string;
  ruleIndex: number;
  definiteBlockers: string[];
  possibleBlockers: string[];
  reasons: ConflictDetail[];
};

export type ConflictReport = {
  byRuleId: Record<string, RuleConflict>;
  order: string[];
  rulesWithDefinite: number;
  rulesWithPossible: number;
};

export function analyzeConflicts(rules: Rule[]): ConflictReport {
  const byRuleId: Record<string, RuleConflict> = {};
  const order = rules.map((r) => r.id);

  for (let i = 0; i < rules.length; i++) {
    const later = rules[i];
    const rc: RuleConflict = {
      ruleId: later.id,
      ruleIndex: i,
      definiteBlockers: [],
      possibleBlockers: [],
      reasons: [],
    };

    for (let j = 0; j < i; j++) {
      const earlier = rules[j];
      if (!coversMethod(earlier.method, later.method)) continue;

      if (isDefiniteSubset(earlier, later)) {
        rc.definiteBlockers.push(earlier.id);
        rc.reasons.push({
          blockerId: earlier.id,
          blockerIndex: j,
          kind: "definite",
          method: methodLabel(earlier.method),
          detail: definiteReason(earlier, later),
        });
        // Even if definite, keep scanning to collect multiple blockers for UX context
        continue;
      }

      if (isPossibleOverlap(earlier, later)) {
        rc.possibleBlockers.push(earlier.id);
        rc.reasons.push({
          blockerId: earlier.id,
          blockerIndex: j,
          kind: "possible",
          method: methodLabel(earlier.method),
          detail: possibleReason(earlier, later),
        });
      }
    }

    byRuleId[later.id] = rc;
  }

  let rulesWithDefinite = 0;
  let rulesWithPossible = 0;
  for (const id of order) {
    const rc = byRuleId[id];
    if (!rc) continue;
    if (rc.definiteBlockers.length) rulesWithDefinite++;
    else if (rc.possibleBlockers.length) rulesWithPossible++;
  }

  return { byRuleId, order, rulesWithDefinite, rulesWithPossible };
}

export function coversMethod(earlier?: string, later?: string): boolean {
  const e = normalizeMethod(earlier);
  const l = normalizeMethod(later);
  if (!e) return true; // earlier = Any covers all
  if (!l) return false; // later = Any, earlier specific does not cover all
  return e === l;
}

export function isDefiniteSubset(earlier: Rule, later: Rule): boolean {
  const eIsRegex = !!earlier.isRegex;
  const lIsRegex = !!later.isRegex;
  const ePat = earlier.pattern ?? "";
  const lPat = later.pattern ?? "";

  // Non-regex: empty literal matches all URLs (substring semantics)
  if (!eIsRegex && ePat === "") return true;

  if (!eIsRegex && !lIsRegex) {
    if (ePat === lPat) return true;
    // earlier substring of later → earlier matches a superset of later
    return lPat.includes(ePat);
  }

  if (eIsRegex && lIsRegex) {
    if (ePat === lPat) return true;
    if (isUniversalRegex(ePat)) return true;
    return false;
  }

  if (eIsRegex && !lIsRegex) {
    if (isUniversalRegex(ePat)) return true;
    if (!lPat) return false;
    return isContainsRegexFor(lPat, ePat);
  }

  if (!eIsRegex && lIsRegex) {
    if (!ePat) return true; // earlier literal empty → matches all
    return isContainsRegexFor(ePat, lPat);
  }

  return false;
}

export function isPossibleOverlap(earlier: Rule, later: Rule): boolean {
  const eIsRegex = !!earlier.isRegex;
  const lIsRegex = !!later.isRegex;
  const ePat = earlier.pattern ?? "";
  const lPat = later.pattern ?? "";

  if (eIsRegex) {
    if (isUniversalRegex(ePat)) return false; // already definite
    if (hasDotStar(ePat)) return true;
    if (lIsRegex) {
      // If both patterns encode different literal hosts, do not flag overlap
      const hostE = hostLiteralFromRegex(ePat);
      const hostL = hostLiteralFromRegex(lPat);
      if (hostE && hostL && hostE !== hostL) return false;
      if (sharesLiteralToken(ePat, lPat)) return true;
      const headE = literalHead(ePat);
      const headL = literalHead(lPat);
      if (headE && headL && (headE.startsWith(headL) || headL.startsWith(headE))) return true;
      const sa = simplifyRegexString(ePat);
      const sb = simplifyRegexString(lPat);
      if (sa.length >= 3 && sb.length >= 3 && (sa.includes(sb) || sb.includes(sa))) return true;
      return false;
    } else {
      const escaped = escapeRegExp(lPat);
      return escaped ? ePat.includes(escaped) : false;
    }
  } else {
    if (lIsRegex) {
      if (isContainsRegexFor(ePat, lPat)) return false; // definite handled elsewhere
      if (hasDotStar(lPat) || isVeryBroadRegex(lPat)) return true;
      const escaped = escapeRegExp(ePat);
      return escaped ? lPat.includes(escaped) : false;
    }
  }

  return false;
}

export function isContainsRegexFor(literal: string, regexSrc: string): boolean {
  if (!literal) return false;
  const esc = escapeRegExp(literal);
  const idx = regexSrc.indexOf(esc);
  if (idx === -1) return false;
  const before = regexSrc.slice(0, idx);
  const after = regexSrc.slice(idx + esc.length);
  return hasDotStar(before) && hasDotStar(after);
}

export function isVeryBroadRegex(regexSrc: string): boolean {
  if (isUniversalRegex(regexSrc)) return true;
  return hasDotStar(regexSrc);
}

export function isUniversalRegex(regexSrc: string): boolean {
  const s = regexSrc.trim();
  return s === ".*" || s === "^.*$";
}

export function hasDotStar(src: string): boolean {
  // Detect an occurrence of '.*' where the dot is not escaped by an odd number of backslashes
  const idx = src.indexOf(".*");
  if (idx === -1) return false;
  let bs = 0;
  for (let i = idx - 1; i >= 0 && src[i] === "\\"; i--) bs++;
  return (bs % 2) === 0;
}

export function sharesLiteralToken(a: string, b: string): boolean {
  const tokensA = extractLiteralTokens(a);
  if (!tokensA.length) return false;
  const tokensB = extractLiteralTokens(b);
  if (!tokensB.length) return false;
  const setB = new Set(tokensB);
  for (const t of tokensA) {
    if (setB.has(t)) return true;
  }
  return false;
}

export function extractLiteralTokens(src: string): string[] {
  const strippedEscapes = src.replace(/\\./g, "");
  const rawTokens = strippedEscapes.split(/[\[\]\(\)\{\}\+\*\?\^\$\|\.]/g);
  return rawTokens.map((t) => t.trim()).filter((t) => t.length >= 2);
}

export function literalHead(src: string): string {
  // Remove anchors first
  let i = 0;
  let out = "";
  const s = src.replace(/^\^/, "").replace(/\$$/, "");
  while (i < s.length) {
    const ch = s[i];
    if (ch === "\\") {
      // escaped literal, include next char if present
      if (i + 1 < s.length) {
        out += s[i + 1];
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (/[[\](){}/+*?^$|.]/.test(ch)) break;
    out += ch;
    i++;
  }
  return out;
}

export function simplifyRegexString(src: string): string {
  // Remove escapes and regex metacharacters, keep common URL/path punctuation
  return src.replace(/\\./g, (m) => m.slice(1)) // unescape escaped char
            .replace(/[\[\]\(\)\{\}\+\*\?\^\$\|]/g, "");
}

export function hostLiteralFromRegex(src: string): string {
  // Extract a literal-ish host from patterns like ^https://example\\.com/...
  const schemeIdx = src.indexOf("://");
  if (schemeIdx === -1) return "";
  let i = schemeIdx + 3; // after ://
  let host = "";
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\") {
      if (i + 1 < src.length) {
        const next = src[i + 1];
        host += next === "." ? "." : next;
        i += 2;
        continue;
      }
      break;
    }
    if (/[/\[\]\(\)\{\}\+\*\?\^\$\|]/.test(ch)) break;
    if (ch === ".") { host += "."; i++; continue; }
    host += ch;
    i++;
  }
  return host;
}

export function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeMethod(m?: string): string {
  return (m || "").trim().toUpperCase();
}

export function methodLabel(m?: string): string {
  const n = normalizeMethod(m);
  return n || "Any";
}

export function definiteReason(earlier: Rule, later: Rule): string {
  const eIsRegex = !!earlier.isRegex;
  const lIsRegex = !!later.isRegex;
  const ePat = earlier.pattern ?? "";
  const lPat = later.pattern ?? "";

  if (!eIsRegex && ePat === "") return "Earlier empty pattern matches all";
  if (!eIsRegex && !lIsRegex) {
    if (ePat === lPat) return "Same literal pattern";
    if (lPat.includes(ePat)) return "Earlier literal is substring of later";
  }
  if (eIsRegex && lIsRegex) {
    if (ePat === lPat) return "Same regex pattern";
    if (isUniversalRegex(ePat)) return "Earlier regex matches everything";
  }
  if (eIsRegex && !lIsRegex) {
    if (isContainsRegexFor(lPat, ePat)) return "Earlier regex contains later literal";
  }
  if (!eIsRegex && lIsRegex) {
    if (isContainsRegexFor(ePat, lPat)) return "Later regex contains earlier literal";
  }
  return "Earlier rule is a proven superset";
}

export function possibleReason(earlier: Rule, later: Rule): string {
  const eIsRegex = !!earlier.isRegex;
  const lIsRegex = !!later.isRegex;
  const ePat = earlier.pattern ?? "";
  const lPat = later.pattern ?? "";
  if (eIsRegex) {
    if (hasDotStar(ePat)) return "Earlier regex is broad (contains .*)";
    if (!lIsRegex) {
      const esc = escapeRegExp(lPat);
      if (esc && ePat.includes(esc)) return "Earlier regex includes later literal";
    }
    if (lIsRegex && sharesLiteralToken(ePat, lPat)) return "Regexes share literal segments";
  } else if (lIsRegex) {
    if (hasDotStar(lPat) || isVeryBroadRegex(lPat)) return "Later regex is broad; overlap likely";
    const esc = escapeRegExp(ePat);
    if (esc && lPat.includes(esc)) return "Later regex includes earlier literal";
  }
  return "Patterns may overlap";
}
