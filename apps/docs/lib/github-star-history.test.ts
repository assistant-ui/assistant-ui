import { afterEach, describe, expect, it, vi } from "vitest";

const { getStarHistory } = await import("./github");

const PAGE_SIZE = 30;

const bucket = (i: number) => ({
  week: 1_700_000_000 + i * 604_800,
  total: 1,
  days: [1, 0, 0, 0, 0, 0, 0],
});

const respond = (weeks: unknown[], link?: string) =>
  new Response(JSON.stringify(weeks), {
    status: 200,
    headers: link ? { Link: link } : {},
  });

const linkTo = (last: number) =>
  `<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=${last}>; rel="last"`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getStarHistory", () => {
  it("asks for the page size the endpoint actually grants", async () => {
    const fetchMock = vi.fn(async () => respond([bucket(0)]));
    vi.stubGlobal("fetch", fetchMock);

    await getStarHistory();

    expect(String(fetchMock.mock.calls[0]![0])).toContain(
      `per_page=${PAGE_SIZE}`,
    );
  });

  it("follows rel=last and keeps every page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("page=1")
          ? respond(
              Array.from({ length: PAGE_SIZE }, (_, i) => bucket(i)),
              linkTo(2),
            )
          : respond([bucket(PAGE_SIZE)]),
      ),
    );

    await expect(getStarHistory()).resolves.toHaveLength(PAGE_SIZE + 1);
  });

  it("refuses a full first page with no rel=last", async () => {
    // Page 1 is the newest weeks and the caller accumulates from the oldest, so
    // an unbounded listing would rebase the curve rather than shorten it.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        respond(Array.from({ length: PAGE_SIZE }, (_, i) => bucket(i))),
      ),
    );

    await expect(getStarHistory()).resolves.toBeNull();
  });

  it("accepts a short first page as the whole listing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respond([bucket(0), bucket(1)])),
    );

    await expect(getStarHistory()).resolves.toHaveLength(2);
  });

  it("refuses a listing longer than it will page through", async () => {
    // Clamping would drop the oldest weeks, which rebases the curve the same
    // way an unbounded listing does.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        respond(
          Array.from({ length: PAGE_SIZE }, (_, i) => bucket(i)),
          linkTo(1000),
        ),
      ),
    );

    await expect(getStarHistory()).resolves.toBeNull();
  });

  it("returns null for a 200 that is not a list of weeks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: "Not Found" }), {
            status: 200,
          }),
      ),
    );

    await expect(getStarHistory()).resolves.toBeNull();
  });

  it("returns null for a list whose buckets are not buckets", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respond([{ week: "1700000000", total: 1, days: [] }])),
    );

    await expect(getStarHistory()).resolves.toBeNull();
  });

  it("returns null when a later page fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("page=1")
          ? respond(
              Array.from({ length: PAGE_SIZE }, (_, i) => bucket(i)),
              linkTo(2),
            )
          : new Response("nope", { status: 500 }),
      ),
    );

    await expect(getStarHistory()).resolves.toBeNull();
  });
});
