import { afterEach, expect, it, vi } from "vitest";
import { UMAMI_SAMPLE_RATE, isSampledSession } from "./umami-sampling";

const globalObject = globalThis as {
  window?: { sessionStorage: Pick<Storage, "getItem" | "setItem"> };
};

const previousWindow = globalObject.window;

const createSessionStorage = (initial: Record<string, string> = {}) => {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
};

const createBlockedSessionStorage = () => ({
  getItem: () => {
    throw new Error("session storage is blocked");
  },
  setItem: () => {
    throw new Error("session storage is blocked");
  },
});

afterEach(() => {
  if (previousWindow === undefined) {
    delete globalObject.window;
  } else {
    globalObject.window = previousWindow;
  }
  vi.restoreAllMocks();
});

it("samples the session when the roll lands under the rate", () => {
  globalObject.window = { sessionStorage: createSessionStorage() };
  vi.spyOn(Math, "random").mockReturnValue(UMAMI_SAMPLE_RATE / 2);

  expect(isSampledSession()).toBe(true);
});

it("excludes the session when the roll lands on the rate", () => {
  globalObject.window = { sessionStorage: createSessionStorage() };
  vi.spyOn(Math, "random").mockReturnValue(UMAMI_SAMPLE_RATE);

  expect(isSampledSession()).toBe(false);
});

it("keeps every call in a session on the same side of the decision", () => {
  globalObject.window = { sessionStorage: createSessionStorage() };
  vi.spyOn(Math, "random")
    .mockReturnValueOnce(UMAMI_SAMPLE_RATE / 2)
    .mockReturnValue(1);

  expect(isSampledSession()).toBe(true);
  expect(isSampledSession()).toBe(true);
  expect(isSampledSession()).toBe(true);
});

it("reuses a decision already stored for the session", () => {
  globalObject.window = {
    sessionStorage: createSessionStorage({ "aui-umami-sample": "0" }),
  };
  const random = vi.spyOn(Math, "random");

  expect(isSampledSession()).toBe(false);
  expect(random).not.toHaveBeenCalled();
});

it("falls back to a per-load roll when session storage is unavailable", () => {
  globalObject.window = { sessionStorage: createBlockedSessionStorage() };
  vi.spyOn(Math, "random").mockReturnValue(UMAMI_SAMPLE_RATE / 2);

  expect(isSampledSession()).toBe(true);
});
