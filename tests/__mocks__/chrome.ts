import { jest } from "@jest/globals";

export type ChromeMockConfig = {
  tabs?: Partial<typeof chrome.tabs>;
  windows?: Partial<typeof chrome.windows>;
  scripting?: Partial<typeof chrome.scripting>;
  runtime?: Partial<typeof chrome.runtime>;
  webRequest?: Partial<typeof chrome.webRequest> & { filterResponseData?: any };
};

export function makeEventMock<
  T extends (...args: any[]) => any,
  U extends string[] = any[]
>(overrides: Partial<chrome.webRequest.WebRequestEvent<T, U>> = {}) {
  const base: chrome.webRequest.WebRequestEvent<T, U> = {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    hasListener: jest.fn(() => false),
    hasListeners: jest.fn(() => false),
    getRules: jest.fn((identifiers: unknown, cb?: unknown) => {
      const callback = typeof identifiers === "function" ? identifiers : cb;
      if (typeof callback === "function") (callback as any)([]);
    }) as any,
    addRules: jest.fn((rules: unknown, cb?: unknown) => {
      const callback = typeof cb === "function" ? cb : undefined;
      callback?.([]);
    }) as any,
    removeRules: jest.fn((identifiers: unknown, cb?: unknown) => {
      const callback = typeof cb === "function" ? cb : undefined;
      callback?.();
    }) as any,
  };
  return Object.assign(base, overrides);
}

export function installChromeMock(overrides: ChromeMockConfig = {}) {
  const base: any = {
    runtime: {
      onConnect: { addListener: jest.fn(), removeListener: jest.fn() },
      onInstalled: { addListener: jest.fn(), removeListener: jest.fn() },
      onStartup: { addListener: jest.fn(), removeListener: jest.fn() },
      onMessage: { addListener: jest.fn(), removeListener: jest.fn() },
      getURL: (path: string) => `chrome-extension://test/${path}`,
      sendMessage: jest.fn((_, cb) => { if (typeof cb === "function") cb(); }),
    },
    tabs: {
      query: jest.fn(() => Promise.resolve([])),
      update: jest.fn(() => Promise.resolve()),
      create: jest.fn(() => Promise.resolve()),
    },
    windows: {
      update: jest.fn(() => Promise.resolve()),
    },
    scripting: {
      executeScript: jest.fn(() => Promise.resolve()),
    },
    webRequest: {
      onBeforeRequest: makeEventMock(),
      onHeadersReceived: makeEventMock(),
      filterResponseData: undefined,
    },
  };

  const mockChrome = mergeDeep(base, overrides);
  (globalThis as any).chrome = mockChrome;
  return mockChrome;
}

export function restoreChromeMock(original: any) {
  (globalThis as any).chrome = original;
}

function mergeDeep(target: any, source: any) {
  Object.entries(source || {}).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value))
    {
      target[key] = mergeDeep(target[key] || {}, value);
    }
    else
    {
      target[key] = value;
    }
  });
  return target;
}
