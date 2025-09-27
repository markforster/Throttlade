import { safeStringify } from "../../src/utils/safeStringify";

describe("safeStringify", () => {
  test("stringifies plain objects with indentation", () => {
    const input = { foo: "bar", baz: 1 };
    expect(safeStringify(input)).toBe(JSON.stringify(input, null, 2));
  });

  test("returns string when value is already a string", () => {
    expect(safeStringify("abc"))
      .toBe("\"abc\"");
  });

  test("falls back to String(value) when JSON.stringify throws", () => {
    const obj: Record<string, any> = {};
    obj.self = obj; // introduce circular reference

    expect(safeStringify(obj)).toBe(String(obj));
  });
});
