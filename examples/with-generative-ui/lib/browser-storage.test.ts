import { afterEach, describe, expect, it, vi } from "vitest";
import { browserStorage } from "./browser-storage";

const memoryStorage = (full = () => false) => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (full())
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      values.set(key, value);
    },
    removeItem: (key: string) => {
      if (full())
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      values.delete(key);
    },
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("browserStorage", () => {
  it("keeps a refused write for this page view, until a later write succeeds", async () => {
    let full = false;
    vi.stubGlobal(
      "localStorage",
      memoryStorage(() => full),
    );
    await browserStorage.setItem("threads", "stored");

    full = true;
    await browserStorage.setItem("threads", "unsaved");
    expect(await browserStorage.getItem("threads")).toBe("unsaved");
    await browserStorage.removeItem("threads");
    expect(await browserStorage.getItem("threads")).toBeNull();

    full = false;
    await browserStorage.setItem("threads", "saved again");
    expect(await browserStorage.getItem("threads")).toBe("saved again");
    expect(localStorage.getItem("threads")).toBe("saved again");
  });

  it("reads nothing when the browser blocks storage", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new DOMException("Blocked", "SecurityError");
      },
    });

    expect(await browserStorage.getItem("blocked")).toBeNull();
  });
});
