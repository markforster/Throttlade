import { installChromeMock, restoreChromeMock, makeEventMock } from "../__mocks__/chrome";
import { throttleWithTimeout, throttleWithStream, canUseStreamStrategy, ThrottleContext } from "../../src/utils/throttling";

describe("throttleWithTimeout", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("returns applied=true when throttleMs > 0", async () => {
    const ctx: ThrottleContext = { url: "https://example.com", throttleMs: 150 };
    const promise = throttleWithTimeout(ctx);
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    jest.advanceTimersByTime(150);
    const result = await promise;
    expect(result).toEqual({ strategy: "TIMEOUT", applied: true });
  });

  test("returns applied=false when throttleMs <= 0", async () => {
    const ctx: ThrottleContext = { url: "https://example.com", throttleMs: 0 };
    const result = await throttleWithTimeout(ctx);
    expect(result).toEqual({ strategy: "TIMEOUT", applied: false, reason: "throttleMs <= 0" });
  });
});

describe("throttleWithStream", () => {
  const originalChrome = (globalThis as any).chrome;

  afterEach(() => {
    jest.useRealTimers();
    restoreChromeMock(originalChrome);
  });

  test("returns unavailable when chrome.webRequest missing", async () => {
    restoreChromeMock(undefined);
    const ctx: ThrottleContext = { url: "https://example.com", throttleMs: 1000 };
    const result = await throttleWithStream(ctx);
    expect(result).toEqual({ strategy: "STREAM", applied: false, reason: "chrome.webRequest unavailable" });
  });

  test("returns unsupported when filterResponseData missing", async () => {
    installChromeMock({ webRequest: {} });
    const ctx: ThrottleContext = { url: "https://example.com", throttleMs: 1000 };
    const result = await throttleWithStream(ctx);
    expect(result).toEqual({ strategy: "STREAM", applied: false, reason: "filterResponseData not supported" });
  });

  test("returns throttleMs<=0 when delay is non-positive", async () => {
    const fakeFilter = jest.fn();
    installChromeMock({ webRequest: { filterResponseData: fakeFilter } });
    const ctx: ThrottleContext = { url: "https://example.com", throttleMs: 0 };
    const result = await throttleWithStream(ctx);
    expect(result).toEqual({ strategy: "STREAM", applied: false, reason: "throttleMs <= 0" });
    expect(fakeFilter).not.toHaveBeenCalled();
  });

  test("sets listeners and resolves timeout when no request observed", async () => {
    jest.useFakeTimers();
    const removeBefore = jest.fn();
    const removeHeaders = jest.fn();
    const addBefore = jest.fn();
    const addHeaders = jest.fn();

    const fakeFilter = jest.fn();
    installChromeMock({
      webRequest: {
        filterResponseData: fakeFilter,
        onBeforeRequest: makeEventMock({ addListener: addBefore, removeListener: removeBefore }),
        onHeadersReceived: makeEventMock({ addListener: addHeaders, removeListener: removeHeaders }),
      },
    });

    const ctx: ThrottleContext = { url: "https://example.com", throttleMs: 500 };
    const promise = throttleWithStream(ctx);
    expect(addBefore).toHaveBeenCalled();
    expect(addHeaders).toHaveBeenCalled();
    jest.advanceTimersByTime(10_000);
    const result = await promise;
    expect(result).toEqual({ strategy: "STREAM", applied: false, reason: "no matching request observed (timeout)" });
    expect(removeBefore).toHaveBeenCalled();
    expect(removeHeaders).toHaveBeenCalled();
  });
});

describe("canUseStreamStrategy", () => {
  const originalChrome = (globalThis as any).chrome;

  afterEach(() => {
    restoreChromeMock(originalChrome);
  });

  test("returns false when filterResponseData missing", () => {
    installChromeMock({ webRequest: {} });
    expect(canUseStreamStrategy()).toBe(false);
  });

  test("returns true when filterResponseData present", () => {
    installChromeMock({
      webRequest: { filterResponseData: () => undefined },
    });
    expect(canUseStreamStrategy()).toBe(true);
  });
});
