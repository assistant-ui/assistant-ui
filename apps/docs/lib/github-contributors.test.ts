import { afterEach, describe, expect, it, vi } from "vitest";

const { getContributors } = await import("./github");

const contributor = (i: number) => ({
  login: `user-${i}`,
  avatar_url: "",
  html_url: "",
  contributions: 1,
});

const firstPage = () =>
  new Response(
    JSON.stringify(Array.from({ length: 100 }, (_, i) => contributor(i))),
    {
      status: 200,
    },
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getContributors", () => {
  it("rejects the complete read when a later page is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        /[?&]page=1(?:&|$)/.test(url)
          ? firstPage()
          : new Response("nope", { status: 502 }),
      ),
    );

    await expect(getContributors()).resolves.toBeNull();
  });

  it("rejects the complete read when a later page throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (/[?&]page=1(?:&|$)/.test(url)) return firstPage();
        throw new Error("socket hang up");
      }),
    );

    await expect(getContributors()).resolves.toBeNull();
  });
});
