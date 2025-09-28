import { jest } from "@jest/globals";

import { installChromeMock, restoreChromeMock } from "../__mocks__/chrome";
import { createThrottleSession } from "../../src/content/throttleHelpers";
import { throttleWithTimeout } from "../../src/utils/throttling";
import { reqStart, reqEnd } from "../../src/utils/requests";

jest.mock("../../src/utils/featureFlags", () => ({
  get THROTTLE_STRATEGY() {
    return featureFlags.THROTTLE_STRATEGY;
  },
}));

const featureFlags = { THROTTLE_STRATEGY: "TIMEOUT" as "TIMEOUT" | "STREAM" };

jest.mock("../../src/utils/throttling", () => ({
  throttleWithTimeout: jest.fn(() => Promise.resolve({ strategy: "TIMEOUT", applied: true })),
}));

jest.mock("../../src/utils/requests", () => ({
  reqStart: jest.fn(),
  reqEnd: jest.fn(),
}));

jest.mock("../../src/utils/pathOf", () => ({
  pathOf: (url: string) => `PATH:${url}`,
}));

const originalChrome = (globalThis as any).chrome;

describe("createThrottleSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    restoreChromeMock(originalChrome);
  });

  test("uses timeout strategy when flag set to TIMEOUT", async () => {
    installChromeMock();

    const session = await createThrottleSession("https://example.com", "GET", 250);

    expect(reqStart).toHaveBeenCalledWith(expect.objectContaining({
      url: "https://example.com",
      path: "PATH:https://example.com",
      method: "GET",
      throttleMs: 250,
    }));
    expect(throttleWithTimeout).toHaveBeenCalledWith(expect.objectContaining({
      url: "https://example.com",
      method: "GET",
      throttleMs: 250,
    }));

    session.complete();
    expect(reqEnd).toHaveBeenCalled();
  });

  test("falls back when stream messaging fails", async () => {
    featureFlags.THROTTLE_STRATEGY = "STREAM";
    const sendMessage = jest.fn(() => Promise.reject(new Error("fail")));
    installChromeMock({ runtime: { sendMessage } });

    const session = await createThrottleSession("https://api.test", "post", 100);

    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "THROTTLE_STREAM_PRIME" }));
    expect(session.ctx).toMatchObject({ url: "https://api.test", method: "POST", throttleMs: 100 });

    session.complete(new Error("boom"));
    expect(reqEnd).toHaveBeenCalledWith(expect.objectContaining({ error: "boom" }));

    featureFlags.THROTTLE_STRATEGY = "TIMEOUT";
  });
});
