import type { LogLevel, RequestEnd, RequestStart } from "../../src/utils/logger";
import type { ThrottleContext } from "../../src/utils/throttling";

const mockBgLog = jest.fn();
const mockPushToDashboards = jest.fn();
const mockBroadcastReqs = jest.fn();
const mockSetLogs = jest.fn();
const mockSetRecent = jest.fn((next: any[]) => {
  mockRecent.splice(0, mockRecent.length, ...next);
});
const mockThrottleWithStream = jest.fn(async (_ctx: ThrottleContext) => {});

const mockInflight = new Map<string, RequestStart>();
const mockRecent: any[] = [];
const mockLogs: any[] = [];

jest.mock("../../src/utils/ports", () => ({
  bgLog: (...args: any[]) => mockBgLog(...args),
  pushToDashboards: (...args: any[]) => mockPushToDashboards(...args),
  dashboardPorts: new Set(),
}));

jest.mock("../../src/utils/log", () => ({
  LOGS: mockLogs,
  setLogs: (entries: any[]) => mockSetLogs(entries),
}));

jest.mock("../../src/utils/requests", () => ({
  broadcastReqs: () => mockBroadcastReqs(),
  inflight: mockInflight,
  recent: mockRecent,
  setRecent: (next: any[]) => mockSetRecent(next),
  REQ_RECENT_CAP: 50,
}));

jest.mock("../../src/utils/throttling", () => ({
  throttleWithStream: (ctx: ThrottleContext) => mockThrottleWithStream(ctx),
}));

const chromeTabsQuery = jest.fn(async () => [] as any[]);
const chromeTabsUpdate = jest.fn(async () => undefined);
const chromeTabsCreate = jest.fn(async () => undefined);
const chromeWindowsUpdate = jest.fn(async () => undefined);
const chromeExecuteScript = jest.fn(async () => undefined);

(globalThis as any).chrome = {
  runtime: {
    onConnect: { addListener: jest.fn() },
    onInstalled: { addListener: jest.fn() },
    onStartup: { addListener: jest.fn() },
    onMessage: { addListener: jest.fn() },
    getURL: (path: string) => `chrome-extension://test/${path}`,
  },
  tabs: {
    query: chromeTabsQuery,
    update: chromeTabsUpdate,
    create: chromeTabsCreate,
  },
  windows: {
    update: chromeWindowsUpdate,
  },
  scripting: {
    executeScript: chromeExecuteScript,
  },
} as unknown as typeof chrome;

let messageHandlers: Record<string, (message: any, sendResponse: (value?: any) => void) => any>;

beforeAll(async () => {
  ({ messageHandlers } = await import("../../src/background"));
});

describe("messageHandlers", () => {
  const sendResponse = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    sendResponse.mockClear();
    mockInflight.clear();
    mockRecent.splice(0, mockRecent.length);
    mockLogs.splice(0, mockLogs.length);
    chromeTabsQuery.mockImplementation(async () => [] as any[]);
  });

  describe("OPEN_DASHBOARD_TAB", () => {
    test("activates an existing dashboard tab", async () => {
      chromeTabsQuery.mockResolvedValueOnce([{ id: 5, windowId: 10 } as any]);

      await messageHandlers.OPEN_DASHBOARD_TAB({}, sendResponse);

      expect(chromeTabsUpdate).toHaveBeenCalledWith(5, { active: true });
      expect(chromeWindowsUpdate).toHaveBeenCalledWith(10, { focused: true });
      expect(sendResponse).toHaveBeenCalledWith(true);
    });

    test("creates the dashboard tab when none exists", async () => {
      chromeTabsQuery.mockResolvedValueOnce([]);

      await messageHandlers.OPEN_DASHBOARD_TAB({}, sendResponse);

      expect(chromeTabsCreate).toHaveBeenCalledWith({ url: expect.stringContaining("options.html") });
      expect(sendResponse).toHaveBeenCalledWith(true);
    });

    test("reports failure when tab operations throw", async () => {
      chromeTabsQuery.mockRejectedValueOnce(new Error("boom"));

      await messageHandlers.OPEN_DASHBOARD_TAB({}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(false);
    });
  });

  describe("LOGGER_LOG", () => {
    test("logs message payload and acknowledges", () => {
      const message = { level: "info" as LogLevel, msg: "Hello", data: { a: 1 }, context: "ctx" };

      const result = messageHandlers.LOGGER_LOG(message, sendResponse);

      expect(mockBgLog).toHaveBeenCalledWith("info", "Hello", { a: 1 }, "ctx");
      expect(sendResponse).toHaveBeenCalledWith(true);
      expect(result).toBe(true);
    });
  });

  describe("LOGGER_CLEAR", () => {
    test("clears logs and notifies dashboards", () => {
      const result = messageHandlers.LOGGER_CLEAR({}, sendResponse);

      expect(mockSetLogs).toHaveBeenCalledWith([]);
      expect(mockPushToDashboards).toHaveBeenCalledWith({ type: "LOGS_UPDATED", entries: mockLogs });
      expect(sendResponse).toHaveBeenCalledWith(true);
      expect(result).toBe(true);
    });
  });

  describe("LOGGER_GET", () => {
    test("responds with current log entries", () => {
      mockLogs.push({ id: 1 });

      const result = messageHandlers.LOGGER_GET({}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({ entries: mockLogs });
      expect(result).toBe(true);
    });
  });

  describe("REQ_TRACK_START", () => {
    test("stores inflight request and broadcasts", () => {
      const start: RequestStart = {
        id: "r1",
        url: "https://example.com",
        path: "/",
        method: "GET",
        throttleMs: 120,
        startedAt: Date.now(),
      };

      const result = messageHandlers.REQ_TRACK_START({ payload: start }, sendResponse);

      expect(mockInflight.get("r1")).toEqual(start);
      expect(mockBgLog).toHaveBeenCalled();
      expect(mockBroadcastReqs).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith(true);
      expect(result).toBe(true);
    });
  });

  describe("REQ_TRACK_END", () => {
    test("finalises tracked request and logs outcome", () => {
      const start: RequestStart = {
        id: "r1",
        url: "https://example.com",
        path: "/",
        method: "GET",
        throttleMs: 120,
        startedAt: 20,
      };
      mockInflight.set(start.id, start);

      const end: RequestEnd = { id: "r1", finishedAt: 80 };

      const result = messageHandlers.REQ_TRACK_END({ payload: end }, sendResponse);

      expect(mockInflight.has("r1")).toBe(false);
      expect(mockRecent[0]).toEqual(expect.objectContaining({ id: "r1", finishedAt: 80 }));
      expect(mockBroadcastReqs).toHaveBeenCalled();
      expect(mockBgLog).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith(true);
      expect(result).toBe(true);
    });

    test("handles unknown request IDs gracefully", () => {
      const end: RequestEnd = { id: "missing", finishedAt: Date.now() };

      const result = messageHandlers.REQ_TRACK_END({ payload: end }, sendResponse);

      expect(mockBroadcastReqs).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith(true);
      expect(result).toBe(true);
    });
  });

  describe("REQS_GET", () => {
    test("responds with inflight and recent collections", () => {
      const start: RequestStart = {
        id: "r1",
        url: "https://example.com",
        path: "/",
        method: "GET",
        throttleMs: 120,
        startedAt: Date.now(),
      };
      mockInflight.set(start.id, start);
      mockRecent.push({ id: "r2" });

      const result = messageHandlers.REQS_GET({}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({ inflight: Array.from(mockInflight.values()), recent: mockRecent });
      expect(result).toBe(true);
    });
  });

  describe("THROTTLE_STREAM_PRIME", () => {
    test("responds started false when ctx missing", () => {
      const result = messageHandlers.THROTTLE_STREAM_PRIME({}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({ started: false });
      expect(result).toBe(true);
    });

    test("invokes throttling and replies started true", () => {
      const ctx = { id: "ctx" } as unknown as ThrottleContext;

      const result = messageHandlers.THROTTLE_STREAM_PRIME({ ctx }, sendResponse);

      expect(mockThrottleWithStream).toHaveBeenCalledWith(ctx);
      expect(sendResponse).toHaveBeenCalledWith({ started: true });
      expect(result).toBe(true);
    });

    test("catches throttling errors and signals false", () => {
      const ctx = { id: "ctx" } as unknown as ThrottleContext;
      mockThrottleWithStream.mockImplementationOnce(() => {
        throw new Error("fail");
      });

      const result = messageHandlers.THROTTLE_STREAM_PRIME({ ctx }, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({ started: false });
      expect(result).toBe(true);
    });
  });
});
