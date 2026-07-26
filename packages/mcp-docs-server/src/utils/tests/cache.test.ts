import { describe, it, expect } from "vitest";
import { cacheListing } from "../cache.js";

describe("cacheListing", () => {
  it("scans once and reuses the result", async () => {
    let calls = 0;
    const listing = cacheListing(async () => {
      calls++;
      return ["a", "b"];
    });
    const first = await listing();
    const second = await listing();
    expect(second).toBe(first);
    expect(calls).toBe(1);
  });

  it("shares one in-flight scan across concurrent callers", async () => {
    let calls = 0;
    const listing = cacheListing(async () => {
      calls++;
      return ["a"];
    });
    const [first, second] = await Promise.all([listing(), listing()]);
    expect(second).toBe(first);
    expect(calls).toBe(1);
  });

  it("re-scans after a failed scan", async () => {
    let calls = 0;
    const listing = cacheListing(async () => {
      calls++;
      if (calls === 1) throw new Error("boom");
      return ["a"];
    });
    await expect(listing()).rejects.toThrow("boom");
    expect(await listing()).toEqual(["a"]);
    expect(calls).toBe(2);
  });

  it("does not cache an empty listing", async () => {
    let calls = 0;
    const listing = cacheListing(async () => {
      calls++;
      return calls === 1 ? [] : ["a"];
    });
    expect(await listing()).toEqual([]);
    expect(await listing()).toEqual(["a"]);
    expect(await listing()).toEqual(["a"]);
    expect(calls).toBe(2);
  });
});
