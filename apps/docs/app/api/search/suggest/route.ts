import { z } from "zod";
import { checkDocsSearchRateLimit } from "@/lib/rate-limit";
import { searchablePages } from "@/lib/search/corpus";
import { SEARCH_SCOPES } from "@/lib/search/route-query";
import { createDocsRouteSearch } from "@/lib/search/route-search";

const input = z.object({
  query: z.string().trim().min(4).max(120),
  scope: z.enum(SEARCH_SCOPES).default("All"),
});

let search: ReturnType<typeof createDocsRouteSearch> | undefined;

export async function GET(request: Request) {
  const params = input.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!params.success) return new Response("Invalid search", { status: 400 });

  const json = (pages: unknown[]) =>
    Response.json({ pages }, { headers: { "Cache-Control": "no-store" } });
  const apiKey = process.env.JEV_KEY;
  if (!apiKey) return json([]);

  const limited = await checkDocsSearchRateLimit(request);
  if (limited) return limited;

  search ??= createDocsRouteSearch({
    apiKey,
    pages: searchablePages().map((page) => ({
      url: page.url,
      title: page.data.title,
      description: page.data.description ?? "",
    })),
  });
  return json(
    await search(params.data.query, params.data.scope, request.signal),
  );
}
