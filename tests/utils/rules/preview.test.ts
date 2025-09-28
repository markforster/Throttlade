import type { Rule } from "../../../src/types/types";
import { getFirstMatch, getEvaluationPath } from "../../../src/utils/rules/preview";

describe("rules preview helpers", () => {
  const mk = (id: string, pattern: string, isRegex = false, method?: string): Rule => ({ id, pattern, isRegex, delayMs: 1, method });

  test("getFirstMatch respects method Any and specific", () => {
    const rules: Rule[] = [
      mk("a", "api", false, undefined),
      mk("b", "/api/v1", false, "GET"),
    ];
    const res = getFirstMatch(rules, "https://x.com/api/v1", "GET");
    expect(res?.rule.id).toBe("a");
    const res2 = getFirstMatch(rules, "https://x.com/api/v1", "POST");
    expect(res2?.rule.id).toBe("a");
  });

  test("getFirstMatch matches regex and handles invalid regex", () => {
    const goodRe = mk("r", "^https://x\\.com/.*$", true, "GET");
    const badRe = mk("b", "^/(foo", true, "GET");
    const rules: Rule[] = [badRe, goodRe];
    const res = getFirstMatch(rules, "https://x.com/path", "GET");
    expect(res?.rule.id).toBe("r");
  });

  test("empty literal matches all (includes '')", () => {
    const rules: Rule[] = [ mk("e", "", false, "GET") ];
    const res = getFirstMatch(rules, "https://x.com", "GET");
    expect(res?.rule.id).toBe("e");
  });

  test("getEvaluationPath reports steps and stops at win", () => {
    const rules: Rule[] = [
      mk("a", "users", false, "POST"), // method mismatch under GET
      mk("b", "^https://x\\.com/.*$", true, "GET"), // will match
      mk("c", "never", false, "GET"),
    ];
    const steps = getEvaluationPath(rules, "https://x.com/api", "GET");
    expect(steps.length).toBe(2); // stops at win
    expect(steps[0]).toEqual({ idx: 1, methodOk: false, patternOk: false });
    expect(steps[1].methodOk).toBe(true);
    expect(steps[1].patternOk).toBe(true);
  });

  test("disabled rules are ignored by preview helpers", () => {
    const rules: Rule[] = [
      mk("disabled", "api", false, "GET"),
      mk("win", "/api/v1", false, "GET"),
    ];
    // Mark the first rule disabled
    (rules[0] as any).enabled = false;

    const res = getFirstMatch(rules, "https://x.com/api/v1", "GET");
    expect(res?.rule.id).toBe("win");

    const steps = getEvaluationPath(rules, "https://x.com/api/v1", "GET");
    // Only the enabled rule should be evaluated
    expect(steps.length).toBe(1);
    expect(steps[0].patternOk).toBe(true);
  });
});
