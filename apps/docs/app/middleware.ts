import type { RequestMiddlewareContext } from "@farm.js/core/middleware";
import { docsSiteMarkdownFileRewrites } from "@/lib/docs-sites";
import { docsMarkdownFileRewrites } from "@/lib/markdown-rewrites";
import { matchRewrite, type RewriteRule } from "@/lib/rewrite-rules";

// Farm reads this at build time and prerenders every page it leaves out, so each entry stays a literal.
export const config = {
  matcher: ["/changelog", "/docs/mcp", "/docs/.well-known/mcp", /\.mdx?$/],
};

// These must answer before the page routes that would otherwise claim their paths.
const REWRITES: readonly RewriteRule[] = [
  { source: "/docs/mcp", destination: "/api/mcp" },
  { source: "/docs/.well-known/mcp", destination: "/api/mcp" },
  ...docsMarkdownFileRewrites(),
  ...docsSiteMarkdownFileRewrites(),
  { source: "/examples.md", destination: "/llms.mdx/examples" },
  { source: "/examples.mdx", destination: "/llms.mdx/examples" },
  { source: "/examples/:path*.md", destination: "/llms.mdx/examples/:path*" },
  { source: "/examples/:path*.mdx", destination: "/llms.mdx/examples/:path*" },
  ...[".md", ".mdx"].flatMap((extension) => [
    {
      source: `/design/:path+${extension}`,
      has: [{ type: "query" as const, key: "view", value: "radix-ui" }],
      destination: "/radix-llms.mdx/design/:path*",
    },
    {
      source: `/design/:path+${extension}`,
      destination: "/llms.mdx/design/:path*",
    },
    {
      source: `/elements/:path+${extension}`,
      destination: "/llms.mdx/elements/:path*",
    },
    { source: `/blog/:path${extension}`, destination: "/blog/llms.md/:path" },
  ]),
];

const PACKAGE_NAME = /^(?:@[a-z0-9-]+\/)?[a-z0-9-][a-z0-9._-]*$/i;

function legacyChangelogUrl(url: URL): URL {
  const pkg = url.searchParams.get("pkg") ?? "";
  const page = Number(url.searchParams.get("page"));
  const segments = [
    PACKAGE_NAME.test(pkg) ? pkg : null,
    Number.isInteger(page) && page > 1 ? String(page) : null,
  ].filter((s): s is string => s !== null);
  const target = new URL(url);
  target.pathname = ["/changelog", ...segments].join("/");
  target.search = "";
  return target;
}

export function middleware(
  request: Request,
  context: RequestMiddlewareContext,
) {
  const url = new URL(request.url);
  if (url.pathname === "/changelog") {
    if (!url.searchParams.has("pkg") && !url.searchParams.has("page")) return;
    return Response.redirect(legacyChangelogUrl(url), 308);
  }

  const destination = matchRewrite(REWRITES, request);
  if (destination) context.rewrite(destination);
}
