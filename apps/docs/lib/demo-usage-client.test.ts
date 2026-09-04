import { afterEach, describe, expect, it, vi } from "vitest";

const payload = {
  used: 2,
  limit: 3,
  remaining: 1,
  resetAt: 1_788_566_400_000,
  signedIn: false,
};

// The module keeps its budget in module scope, so each case gets a fresh copy.
async function load(fetchMock: typeof fetch) {
  vi.resetModules();
  vi.stubGlobal("fetch", fetchMock);
  return import("./demo-usage-client");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readDemoUsage", () => {
  it("answers with the budget the endpoint reports", async () => {
    const fetchMock = vi.fn(async () => Response.json(payload));
    const { readDemoUsage } = await load(fetchMock as unknown as typeof fetch);

    expect(await readDemoUsage()).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("re-reads rather than reusing a read that predates the question", async () => {
    const fetchMock = vi.fn(async () => Response.json(payload));
    const { readDemoUsage } = await load(fetchMock as unknown as typeof fetch);

    await readDemoUsage();
    await readDemoUsage();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // The composer settles open on an unreadable budget so the gate does not
  // block, but reporting that as a real budget would tell the visitor they have
  // no conversations left and that the day resets at the epoch.
  it("answers with nothing when the read fails", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 500 }));
    const { readDemoUsage } = await load(fetchMock as unknown as typeof fetch);

    expect(await readDemoUsage()).toBeNull();
  });

  it("answers with nothing when the request itself throws", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("offline");
    });
    const { readDemoUsage } = await load(fetchMock as unknown as typeof fetch);

    expect(await readDemoUsage()).toBeNull();
  });
});
