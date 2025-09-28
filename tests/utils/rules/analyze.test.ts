import type { Rule } from "../../../src/types/types";
import {
  analyzeConflicts,
  coversMethod,
  isDefiniteSubset,
  isPossibleOverlap,
  isContainsRegexFor,
  isVeryBroadRegex,
  hasDotStar,
  normalizeMethod,
} from "../../../src/utils/rules/analyze";

describe("rules analyzer helpers", () => {
  test("coversMethod - Any covers specific; specific does not cover Any", () => {
    expect(coversMethod(undefined, "GET")).toBe(true);
    expect(coversMethod("GET", undefined)).toBe(false);
    expect(coversMethod("get", "GET")).toBe(true);
    expect(coversMethod("GET", "POST")).toBe(false);
  });

  test("hasDotStar detects unescaped .*", () => {
    expect(hasDotStar(".*")).toBe(true);
    expect(hasDotStar("^.*$"))
      .toBe(true);
    expect(hasDotStar("foo.*bar")).toBe(true);
    // Escaped dot should not count
    expect(hasDotStar("\\.\*")).toBe(false);
  });

  test("isContainsRegexFor detects contains-literal forms", () => {
    expect(isContainsRegexFor("api", ".*api.*")).toBe(true);
    expect(isContainsRegexFor("/api/v1", ".*/api/v1.*")).toBe(true);
    expect(isContainsRegexFor("foo", "^foo$")).toBe(false);
    // literal escaping in regex
    expect(isContainsRegexFor("a+b", ".*a\\+b.*")).toBe(true);
  });

  test("isVeryBroadRegex heuristic", () => {
    expect(isVeryBroadRegex(".*")).toBe(true);
    expect(isVeryBroadRegex("^.*$")).toBe(true);
    expect(isVeryBroadRegex("^.*api.*$")).toBe(true);
    expect(isVeryBroadRegex("^https://x\\.com/.*$")).toBe(true);
  });

  test("isDefiniteSubset - non-regex substring and equality", () => {
    const a: Rule = { id: "a", pattern: "api", delayMs: 1 };
    const b: Rule = { id: "b", pattern: "/api/v1", delayMs: 1 };
    expect(isDefiniteSubset(a, b)).toBe(true); // "api" ⊇ "/api/v1" under includes semantics
    expect(isDefiniteSubset(b, a)).toBe(false);
    const c: Rule = { id: "c", pattern: "same", delayMs: 1 };
    const d: Rule = { id: "d", pattern: "same", delayMs: 1 };
    expect(isDefiniteSubset(c, d)).toBe(true);
  });

  test("isDefiniteSubset - regex trivial and contains", () => {
    const broad: Rule = { id: "r1", pattern: ".*", isRegex: true, delayMs: 1 };
    const laterL: Rule = { id: "r2", pattern: "/api", delayMs: 1 };
    expect(isDefiniteSubset(broad, laterL)).toBe(true);

    const e: Rule = { id: "e", pattern: ".*api.*", isRegex: true, delayMs: 1 };
    const f: Rule = { id: "f", pattern: "api", delayMs: 1 };
    expect(isDefiniteSubset(e, f)).toBe(true);

    const g: Rule = { id: "g", pattern: "api", delayMs: 1 };
    const h: Rule = { id: "h", pattern: ".*api.*", isRegex: true, delayMs: 1 };
    expect(isDefiniteSubset(g, h)).toBe(true);

    const anchored: Rule = { id: "i", pattern: "^foo$", isRegex: true, delayMs: 1 };
    const literalFoo: Rule = { id: "j", pattern: "foo", delayMs: 1 };
    expect(isDefiniteSubset(anchored, literalFoo)).toBe(false);
  });

  test("isPossibleOverlap - broad regex and shared literals", () => {
    const e: Rule = { id: "e", pattern: ".*", isRegex: true, delayMs: 1 };
    const l: Rule = { id: "l", pattern: "/api", delayMs: 1 };
    // Universal regex would be definite, not possible
    expect(isPossibleOverlap(e, l)).toBe(false);

    const e2: Rule = { id: "e2", pattern: ".*api.*", isRegex: true, delayMs: 1 };
    expect(isPossibleOverlap(e2, l)).toBe(true);

    const r1: Rule = { id: "r1", pattern: "^https://x\\.com/.*$", isRegex: true, delayMs: 1 };
    const r2: Rule = { id: "r2", pattern: "^https://x\\.com/api/.*$", isRegex: true, delayMs: 1 };
    expect(isPossibleOverlap(r1, r2)).toBe(true);

    const disjointA: Rule = { id: "da", pattern: "^https://a\\.com/foo$", isRegex: true, delayMs: 1 };
    const disjointB: Rule = { id: "db", pattern: "^https://b\\.com/bar$", isRegex: true, delayMs: 1 };
    expect(isPossibleOverlap(disjointA, disjointB)).toBe(false);
  });
});

describe("analyzeConflicts", () => {
  test("broad Any method rule at top shadows all later rules", () => {
    const rules: Rule[] = [
      { id: "top", pattern: ".*", isRegex: true, delayMs: 1 },
      { id: "a", pattern: "/api", delayMs: 1, method: "GET" },
      { id: "b", pattern: "users", delayMs: 1, method: "POST" },
    ];
    const report = analyzeConflicts(rules);
    expect(report.byRuleId["a"].definiteBlockers).toContain("top");
    expect(report.byRuleId["b"].definiteBlockers).toContain("top");
    expect(report.rulesWithDefinite).toBe(2);
  });

  test("method interplay: earlier Any shadows later specific; earlier specific does not shadow later Any", () => {
    const earlierAny: Rule = { id: "ea", pattern: "api", delayMs: 1 }; // Any method
    const laterGet: Rule = { id: "lg", pattern: "api", delayMs: 1, method: "GET" };
    const r1 = analyzeConflicts([earlierAny, laterGet]);
    expect(r1.byRuleId["lg"].definiteBlockers).toContain("ea");

    const earlierGet: Rule = { id: "eg", pattern: "api", delayMs: 1, method: "GET" };
    const laterAny: Rule = { id: "la", pattern: "api", delayMs: 1 }; // Any
    const r2 = analyzeConflicts([earlierGet, laterAny]);
    expect(r2.byRuleId["la"].definiteBlockers.length).toBe(0);
    expect(r2.byRuleId["la"].possibleBlockers.length).toBe(0);
  });

  test("regex equality with methods: earlier Any shadows later GET; earlier GET does not shadow later Any", () => {
    const pat = "^https://x\\.com/api/.*$";
    const earlierAny: Rule = { id: "ea", pattern: pat, isRegex: true, delayMs: 1 };
    const laterGet: Rule = { id: "lg", pattern: pat, isRegex: true, delayMs: 1, method: "GET" };
    const r1 = analyzeConflicts([earlierAny, laterGet]);
    expect(r1.byRuleId["lg"].definiteBlockers).toContain("ea");

    const earlierGet: Rule = { id: "eg", pattern: pat, isRegex: true, delayMs: 1, method: "GET" };
    const laterAny: Rule = { id: "la", pattern: pat, isRegex: true, delayMs: 1 };
    const r2 = analyzeConflicts([earlierGet, laterAny]);
    expect(r2.byRuleId["la"].definiteBlockers.length).toBe(0);
  });

  test("non-regex earlier longer than later (no shadow)", () => {
    const earlier: Rule = { id: "e", pattern: "/api/v1", delayMs: 1 };
    const later: Rule = { id: "l", pattern: "api", delayMs: 1 };
    expect(isDefiniteSubset(earlier, later)).toBe(false);
    const report = analyzeConflicts([earlier, later]);
    expect(report.byRuleId["l"].definiteBlockers.length).toBe(0);
  });

  test("isContainsRegexFor negative edges do not mark definite", () => {
    expect(isContainsRegexFor("literal", "^.*literal$")).toBe(false);
    expect(isContainsRegexFor("literal", "^literal.*$")).toBe(false);
  });

  test("reasons contain kind and non-empty detail", () => {
    const rules: Rule[] = [
      { id: "top", pattern: ".*", isRegex: true, delayMs: 1 },
      { id: "a", pattern: "/api", delayMs: 1 },
    ];
    const report = analyzeConflicts(rules);
    const reasons = report.byRuleId["a"].reasons;
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons[0].kind).toBe("definite");
    expect(typeof reasons[0].detail).toBe("string");
    expect(reasons[0].detail.length).toBeGreaterThan(0);
  });

  test("multiple blockers are collected", () => {
    const rules: Rule[] = [
      { id: "u", pattern: ".*", isRegex: true, delayMs: 1 },
      { id: "w", pattern: "api", delayMs: 1 },
      { id: "x", pattern: "/api/v1", delayMs: 1 },
    ];
    const report = analyzeConflicts(rules);
    expect(report.byRuleId["x"].definiteBlockers).toEqual(["u", "w"]);
  });

  test("empty literal earlier shadows everything; later empty literal needs universal regex earlier", () => {
    const earlierEmpty: Rule = { id: "e", pattern: "", delayMs: 1 };
    const laterAny: Rule = { id: "l", pattern: "/anything", delayMs: 1 };
    expect(isDefiniteSubset(earlierEmpty, laterAny)).toBe(true);

    const earlierRegex: Rule = { id: "re", pattern: ".*api$", isRegex: true, delayMs: 1 };
    const laterEmpty: Rule = { id: "le", pattern: "", delayMs: 1 };
    expect(isDefiniteSubset(earlierRegex, laterEmpty)).toBe(false);

    const earlierUniversal: Rule = { id: "ru", pattern: ".*", isRegex: true, delayMs: 1 };
    expect(isDefiniteSubset(earlierUniversal, laterEmpty)).toBe(true);
  });

  test("method coverage prevents shadowing across different methods", () => {
    const earlier: Rule = { id: "e", pattern: "/api", delayMs: 1, method: "GET" };
    const later: Rule = { id: "l", pattern: "/api", delayMs: 1, method: "POST" };
    const report = analyzeConflicts([earlier, later]);
    expect(report.byRuleId["l"].definiteBlockers.length).toBe(0);
    expect(report.byRuleId["l"].possibleBlockers.length).toBe(0);
  });

  test("non-regex substring causes definite shadowing", () => {
    const earlier: Rule = { id: "e", pattern: "api", delayMs: 1 };
    const later: Rule = { id: "l", pattern: "/api/v1", delayMs: 1 };
    const report = analyzeConflicts([earlier, later]);
    expect(report.byRuleId["l"].definiteBlockers).toEqual(["e"]);
  });
});
