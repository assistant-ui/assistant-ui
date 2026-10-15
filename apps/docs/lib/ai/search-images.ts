import { tool, zodSchema } from "ai";
import z from "zod";

const SEARCH_TIMEOUT_MS = 5_000;

type WikipediaPage = {
  index: number;
  title: string;
  fullurl: string;
  thumbnail?: { source: string; width: number; height: number };
};

const findImages = async (
  query: string,
  count: number,
  signal?: AbortSignal,
) => {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: query,
    gsrlimit: String(count * 3),
    prop: "pageimages|info",
    piprop: "thumbnail",
    pithumbsize: "960",
    inprop: "url",
  }).toString();
  const timeout = AbortSignal.timeout(SEARCH_TIMEOUT_MS);
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "assistant-ui-docs/1.0 (https://github.com/assistant-ui/assistant-ui)",
    },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) return [];
  const data = (await response.json()) as {
    query?: { pages?: WikipediaPage[] };
  };
  return (data.query?.pages ?? [])
    .filter((page) => page.thumbnail)
    .sort((a, b) => a.index - b.index)
    .slice(0, count)
    .map((page) => ({
      src: page.thumbnail!.source,
      width: page.thumbnail!.width,
      height: page.thumbnail!.height,
      alt: page.title,
      page: page.fullurl,
    }));
};

export const searchImagesTool = tool({
  description:
    "Finds photos on Wikipedia for each query, such as a landmark, a dish, or a product, and returns each photo's URL, size, alt text, and source page. Ask for every subject in one call.",
  inputSchema: zodSchema(
    z.object({
      queries: z
        .array(z.string())
        .min(1)
        .max(8)
        .describe("What to find, one entry per subject, such as Bixby Bridge."),
      perQuery: z
        .number()
        .int()
        .min(1)
        .max(3)
        .optional()
        .describe("Photos per query, from 1 to 3; defaults to 1."),
    }),
  ),
  execute: async ({ queries, perQuery = 1 }, { abortSignal }) => ({
    results: await Promise.all(
      queries.map(async (query) => ({
        query,
        images: await findImages(query, perQuery, abortSignal).catch(() => []),
      })),
    ),
  }),
});
