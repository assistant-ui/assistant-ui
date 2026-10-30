const port = 3331;
const origin = `http://localhost:${port}`;
const production = "https://(?:www\\.)?assistant-ui\\.com";

// Local runs check only links into this build, so they never load third-party
// sites; the weekly and manual CI runs set LINKINATOR_EXTERNAL=1 to add them.
const external = process.env.LINKINATOR_EXTERNAL === "1";

export default {
  recurse: true,
  // The docs sidebar renders on the client, so a crawl from / alone misses most
  // pages; the sitemap lists every one.
  sitemap: [`${origin}/sitemap.xml`],
  // The sitemap and many pages link with absolute production URLs; check those
  // paths against this build instead of the deployed site.
  urlRewriteSearch: production,
  urlRewriteReplace: origin,
  skip: [
    // These render npm and GitHub API reads on every request, so crawling them
    // sends unauthenticated API traffic and fails on rate limits, not links.
    `^(?:${origin}|${production})/(packages|traction)\\b`,
    ...(external
      ? [
          // Quickstarts point readers at their own dev server.
          `^http://localhost(?!:${port})`,
          // The changelog links thousands of releases, pull requests, and
          // commits built from GitHub's own data, and edit links redirect
          // anonymous requests to a login page whether or not the file exists.
          "^https://github\\.com/assistant-ui/assistant-ui/(commit|pull|releases|edit)/",
          // Medium answers every non-browser request with a 403, its home page included.
          "^https://medium\\.com/",
        ]
      : // linkinator matches skip rules before it rewrites a page's links, so
        // production URLs have to pass here to be rewritten and checked.
        [`^(?!${origin}|${production})`]),
  ],
  verbosity: "error",
  ...(external && {
    concurrency: 10,
    timeout: 20_000,
    retry: true,
    retryErrors: true,
  }),
};
