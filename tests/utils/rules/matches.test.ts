import type { Rule } from "../../../src/types/types";
import { matches } from "../../../src/utils/rules/matches";

let mockEnabled = true;
let mockRules: Rule[] = [];

jest.mock("../../../src/utils/rules", () => ({
  __esModule: true,
  get enabled() {
    return mockEnabled;
  },
  get rules() {
    return mockRules;
  },
}));

describe("matches", () => {
  beforeEach(() => {
    mockEnabled = true;
    mockRules = [];
  });

  test("returns undefined when matching is disabled", () => {
    mockEnabled = false;
    mockRules = [
      { id: "w1", pattern: "/api", delayMs: 100, method: "GET" },
    ];

    expect(matches("https://example.com/api/users", "GET")).toBeUndefined();
  });

  test("matches the first wildcard rule whose method and pattern align", () => {
    const wildcardRule: Rule = {
      id: "wildcard",
      pattern: "/users",
      isRegex: false,
      delayMs: 200,
      method: "GET",
    };
    const regexRule: Rule = {
      id: "regex",
      pattern: "^https://example.com/api/.*$",
      isRegex: true,
      delayMs: 300,
      method: "POST",
    };

    mockRules = [wildcardRule, regexRule];

    const result = matches("https://example.com/users/42", "GET");
    expect(result).toBe(wildcardRule);
  });

  test("evaluates regex rules when enabled", () => {
    const regexRule: Rule = {
      id: "regex",
      pattern: "^https://example.com/api/.*$",
      isRegex: true,
      delayMs: 300,
      method: "post", // ensure case-insensitive comparison
    };
    mockRules = [regexRule];

    const match = matches("https://example.com/api/report", "POST");
    expect(match).toBe(regexRule);

    const noMatch = matches("https://example.com/other", "POST");
    expect(noMatch).toBeUndefined();
  });
});
