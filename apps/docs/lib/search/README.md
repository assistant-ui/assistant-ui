# Docs command search

Cmd+K (Ctrl+K on Windows/Linux) searches the current page and the docs catalogue.
The palette uses the shared command and dialog primitives, with scopes for Docs,
Elements, Examples, and Design. It has no chat mode. A query with no results
offers one action, which closes the palette and sends the query to Ask AI. The
action is missing on embedded pages, when no Ask AI handler
is registered, and after an index error.

Opening the palette immediately shows built-in page shortcuts grouped by category.
These links stay available while the full index loads, including if it fails.
Once loaded, every indexed page is available in its category, with shortcuts
first and the remaining pages alphabetically. **All** includes every category;
the footer shows the number of pages in the selected scope.
Search progress appears only after a query is entered. Index errors expose Retry
in both browse and search views; loading times out after ten seconds.

Local title, description, and heading matches appear immediately, and prose on
the current page is searched too. Prose and code from other pages stay out of the
browser index to keep its payload small. For eligible queries, after 200 ms
`/api/search/suggest` adds new destinations under **Suggested pages**, below
local matches so existing results stay in place: pages Jev selects by meaning,
then up to five pages with a body paragraph that contains every word of the
query, stop words aside. These come from the server-only content index that
also backs `search_docs` (`searchContent` without its any-word fallback) and
leave out pages the browser index already lists from their title, description
or headings. When nothing matches anywhere, the query is retried once with each
misspelled word of five or more letters replaced by the most frequent docs word
one edit away that starts with the same letter (`spelling.ts`). Body-text
matches need no key, because they never leave the server. Short queries, exact titles/URLs, and queries
containing common credential prefixes are skipped. The catalogue comes from `searchablePages()`,
the same source as the ordinary index. No manually maintained semantic aliases
or model-generated URLs are used.

Set the server-only `JEV_KEY` in `apps/docs/.env.local` locally or the docs
project's environment on Vercel. Never prefix it with `NEXT_PUBLIC_`. The request
body contains the query and public page metadata; the key is sent to TypeSafe as
the bearer authorization credential and is never returned to the client.
Production also uses the site's existing Upstash credentials for
independent search limits: 60 requests/minute/IP, 1,000/day/IP, and 20,000/day
across the deployment. A request over a limit gets a 429 and no suggestions. A
missing key, unavailable limiter, timeout, or upstream error leaves ordinary
search and body-text matches available.

The server uses `jev-latest` at the [TypeSafe endpoint](https://docs.typesafe.ai/api).
Choice questions contain at most 254 pages plus `none`; larger catalogues use
multiple questions in one request. Unknown choices and choices with confidence
or probability below 0.6 are ignored. Successful decisions are cached for five
minutes in a bounded process-local cache. Requests time out after 1.5 seconds,
and changing the query or closing the palette cancels obsolete client work.

Run the deterministic search, navigation, and rate-limit tests from the root:

```sh
pnpm --filter @assistant-ui/docs-site test lib/search hooks/use-search-suggestions.test.tsx components/shared/search-dialog.test.tsx lib/rate-limit.test.ts app/api/search/suggest/route.test.ts
```

The optional live evaluation uses the published docs catalogue and makes paid
Jev requests with the configured key. From `apps/docs`:

```sh
RUN_JEV_SEARCH_EVAL=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run lib/search/route-search.live.test.ts
```

Check Cmd+K, category filtering, arrow navigation, Enter, Escape, focus return,
and the 390px mobile layout in both themes before publishing.
