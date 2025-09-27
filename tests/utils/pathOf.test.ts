import { pathOf } from "../../src/utils/pathOf";

describe("pathOf", () => {
  const originalBaseUri = document.baseURI;

  beforeEach(() => {
    Object.defineProperty(document, "baseURI", {
      configurable: true,
      value: "https://example.com/app/",
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(document, "baseURI", {
      configurable: true,
      value: originalBaseUri,
      writable: true,
    });
  });

  test("returns pathname for absolute URL", () => {
    expect(pathOf("https://example.com/app/dashboard"))
      .toBe("/app/dashboard");
  });

  test("resolves relative URLs against document.baseURI", () => {
    expect(pathOf("./styles/main.css")).toBe("/app/styles/main.css");
  });

  test("falls back to original string when URL construction fails", () => {
    const badInput = "::::";
    const originalURL = globalThis.URL;
    globalThis.URL = function () {
      throw new TypeError("boom");
    } as unknown as typeof URL;

    expect(pathOf(badInput)).toBe(badInput);

    globalThis.URL = originalURL;
  });
});
