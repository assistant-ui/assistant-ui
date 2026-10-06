import { describe, expect, it, vi } from "vitest";
import { createDocsRouteSearch } from "./route-search";
import {
  inSearchScope,
  shouldSuggestDocsRoute,
  type RoutePage,
} from "./route-query";

const pages: RoutePage[] = [
  {
    url: "/docs/cloud",
    title: "Assistant Cloud",
    description: "Persist conversations and manage users.",
  },
  {
    url: "/elements/thread",
    title: "Thread",
    description: "Display messages in a conversation.",
  },
];
const answer = (choice = "page_0", confidence = 0.9, probability = 0.9) => ({
  type: "choice",
  choice,
  confidence,
  probabilities: { [choice]: probability },
});
const response = (value = answer()) =>
  Response.json({ answers: { pages_0: value } });
const query = "keep conversations after refreshing";

it("searches meaning over the catalogue and returns only the selected existing page", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response());
  const search = createDocsRouteSearch({ pages, apiKey: "test-key", fetcher });
  expect(await search(query, "All")).toEqual([pages[0]]);
  const [url, request] = fetcher.mock.calls[0]!;
  expect(url).toBe("https://api.typesafe.ai/v1/systemone");
  expect(request?.headers).toEqual({
    Authorization: "Bearer test-key",
    "Content-Type": "application/json",
  });
  const body = JSON.parse(request?.body as string);
  expect(body.model).toBe("jev-latest");
  expect(body.state).toBe(query);
  expect(body.questions.pages_0.criteria.page_0).toContain(
    "Persist conversations",
  );
  expect(body.questions.pages_0.criteria.none).toBeTruthy();
});

it("keeps every page eligible while respecting the 255-choice limit", async () => {
  const catalogue = Array.from({ length: 520 }, (_, i) => ({
    url: `/docs/page-${i}`,
    title: `Page ${i}`,
    description: "A guide",
  }));
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      answers: {
        pages_0: answer("none"),
        pages_1: answer("none"),
        pages_2: answer("page_11"),
      },
    }),
  );
  const search = createDocsRouteSearch({
    pages: catalogue,
    apiKey: "key",
    fetcher,
  });
  expect(await search(query, "All")).toEqual([catalogue[519]]);
  const body = JSON.parse(fetcher.mock.calls[0]![1]?.body as string);
  const choices = Object.values(body.questions).map(
    (question) =>
      Object.keys((question as { criteria: object }).criteria).length,
  );
  expect(choices).toEqual([255, 255, 13]);
});

it("scopes the candidate list and the cache", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => response());
  const search = createDocsRouteSearch({ pages, apiKey: "key", fetcher });
  expect(await search(query, "Docs")).toEqual([pages[0]]);
  expect(await search(query, "Elements")).toEqual([pages[1]]);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(inSearchScope("/docs-other", "Docs")).toBe(false);
});

it("caches successful decisions for five minutes", async () => {
  let time = 0;
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => response());
  const search = createDocsRouteSearch({
    pages,
    apiKey: "key",
    fetcher,
    now: () => time,
  });
  await search(query, "All");
  await search(` ${query.toUpperCase()} `, "All");
  expect(fetcher).toHaveBeenCalledTimes(1);
  time = 300_001;
  await search(query, "All");
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it.each([
  answer("none"),
  answer("https://evil.example"),
  answer("page_9"),
  answer("page_0", 0.59),
  answer("page_0", 0.9, 0.59),
])("does not suggest an unknown or uncertain choice: %j", async (value) => {
  const search = createDocsRouteSearch({
    pages,
    apiKey: "key",
    fetcher: vi.fn<typeof fetch>().mockResolvedValue(response(value)),
  });
  expect(await search(query, "All")).toEqual([]);
});

it("falls back on HTTP and malformed responses without caching failures", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
    .mockResolvedValueOnce(
      Response.json({ answers: { pages_0: { choice: "page_0" } } }),
    )
    .mockResolvedValueOnce(response());
  const search = createDocsRouteSearch({ pages, apiKey: "key", fetcher });
  expect(await search(query, "All")).toEqual([]);
  expect(await search(query, "All")).toEqual([]);
  expect(await search(query, "All")).toEqual([pages[0]]);
});

it("bounds network time and ignores cancelled requests", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async (_, options) => {
      return new Promise((_, reject) =>
        options?.signal?.addEventListener("abort", () =>
          reject(new Error("aborted")),
        ),
      );
    });
  const search = createDocsRouteSearch({
    pages,
    apiKey: "key",
    fetcher,
    timeoutMs: 5,
  });
  expect(await search(query, "All")).toEqual([]);
  const controller = new AbortController();
  controller.abort();
  expect(await search(query, "All", controller.signal)).toEqual([]);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

describe("queries that need no model", () => {
  it.each([
    "",
    "abc",
    "Assistant Cloud",
    "/docs/cloud",
    "x".repeat(121),
    "test@example.com",
    "https://example.com",
    "apikey_secret",
  ])("skips %s", (text) => {
    expect(shouldSuggestDocsRoute(text, pages)).toBe(false);
  });
});
