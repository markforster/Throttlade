import type { Rule } from "../../../src/types/types";
import { parseSearchTokens, matchesSearch } from "../../../src/components/tabs/RulesTab.search";

const mkRule = (overrides: Partial<Rule>): Rule => ({
  id: overrides.id ?? "id",
  pattern: overrides.pattern ?? "",
  isRegex: overrides.isRegex ?? false,
  delayMs: overrides.delayMs ?? 1000,
  method: overrides.method,
  enabled: overrides.enabled,
});

describe("parseSearchTokens", () => {
  it("splits on whitespace", () => {
    expect(parseSearchTokens("foo bar")).toEqual([
      { value: "foo", negate: false },
      { value: "bar", negate: false },
    ]);
  });

  it("handles quoted phrases", () => {
    expect(parseSearchTokens('"foo bar" baz')).toEqual([
      { value: "foo bar", negate: false },
      { value: "baz", negate: false },
    ]);
  });

  it("records negated tokens", () => {
    expect(parseSearchTokens('-regex something')).toEqual([
      { value: "regex", negate: true },
      { value: "something", negate: false },
    ]);
  });

  it("ignores empty tokens", () => {
    expect(parseSearchTokens('   ""   ')).toEqual([]);
  });
});

describe("matchesSearch", () => {
  const base = mkRule({ pattern: "https://api.example.com/users", method: "GET" });

  it("returns true when all tokens match", () => {
    const tokens = parseSearchTokens("api GET");
    expect(matchesSearch(base, tokens)).toBe(true);
  });

  it("returns false when any positive token is missing", () => {
    const tokens = parseSearchTokens("missing");
    expect(matchesSearch(base, tokens)).toBe(false);
  });

  it("respects negated tokens", () => {
    const tokens = parseSearchTokens("api -regex");
    expect(matchesSearch(base, tokens)).toBe(true);
    const tokens2 = parseSearchTokens("api -get");
    expect(matchesSearch(base, tokens2)).toBe(false);
  });

  it("matches mode wildcard/regex text", () => {
    const wildcardRule = mkRule({ pattern: "/users", isRegex: false, method: undefined });
    expect(matchesSearch(wildcardRule, parseSearchTokens("wildcard"))).toBe(true);
    const regexRule = mkRule({ pattern: "^/users", isRegex: true });
    expect(matchesSearch(regexRule, parseSearchTokens("regex"))).toBe(true);
  });
});

