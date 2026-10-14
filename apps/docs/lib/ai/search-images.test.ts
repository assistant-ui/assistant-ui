import { afterEach, describe, expect, it, vi } from "vitest";
import { searchImagesTool } from "./search-images";

const options = { toolCallId: "call-1", messages: [], context: {} };

const page = (index: number, title: string, thumbnail = true) => ({
  index,
  title,
  fullurl: `https://en.wikipedia.org/wiki/${title.replaceAll(" ", "_")}`,
  ...(thumbnail
    ? {
        thumbnail: {
          source: `https://upload.wikimedia.org/${index}.jpg`,
          width: 960,
          height: 640,
        },
      }
    : {}),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("searchImagesTool", () => {
  it("keeps the best ranked Wikipedia pages that have a photo, in search order", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        query: {
          pages: [
            page(3, "Bixby Creek"),
            page(1, "Bixby Creek Bridge"),
            page(2, "Big Sur", false),
          ],
        },
      }),
    );

    const output = await searchImagesTool.execute!(
      { queries: ["Bixby Bridge"], perQuery: 2 },
      options,
    );

    expect(output).toEqual({
      results: [
        {
          query: "Bixby Bridge",
          images: [
            {
              src: "https://upload.wikimedia.org/1.jpg",
              width: 960,
              height: 640,
              alt: "Bixby Creek Bridge",
              page: "https://en.wikipedia.org/wiki/Bixby_Creek_Bridge",
            },
            {
              src: "https://upload.wikimedia.org/3.jpg",
              width: 960,
              height: 640,
              alt: "Bixby Creek",
              page: "https://en.wikipedia.org/wiki/Bixby_Creek",
            },
          ],
        },
      ],
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    const params = new URL(String(url)).searchParams;
    expect(params.get("gsrsearch")).toBe("Bixby Bridge");
    expect(params.get("gsrlimit")).toBe("6");
    expect(params.get("prop")).toBe("pageimages|info");
    expect(new Headers(init?.headers).get("User-Agent")).toMatch(
      /^assistant-ui-docs/,
    );
  });

  it("answers each query with one photo by default, and none when Wikipedia fails or cannot be reached", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({ query: { pages: [page(1, "Hearst Castle")] } }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockRejectedValueOnce(new TypeError("fetch failed"));

    const output = await searchImagesTool.execute!(
      { queries: ["Hearst Castle", "Morro Rock", "Pismo Beach"] },
      options,
    );

    expect(output).toMatchObject({
      results: [
        { query: "Hearst Castle", images: [{ alt: "Hearst Castle" }] },
        { query: "Morro Rock", images: [] },
        { query: "Pismo Beach", images: [] },
      ],
    });
  });

  it("gives every request a deadline and stops it with the caller", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ query: { pages: [] } }));
    const caller = new AbortController();
    caller.abort();

    await searchImagesTool.execute!({ queries: ["Morro Rock"] }, options);
    await searchImagesTool.execute!(
      { queries: ["Morro Rock"] },
      { ...options, abortSignal: caller.signal },
    );

    const [first, second] = fetchMock.mock.calls.map(([, init]) => init);
    expect(first?.signal).toBeInstanceOf(AbortSignal);
    expect(first?.signal?.aborted).toBe(false);
    expect(second?.signal?.aborted).toBe(true);
  });
});
