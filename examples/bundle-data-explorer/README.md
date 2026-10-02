# Data exploration bundle

Downloaded source: `npm install`, `npm run build`, then `npm run preview`.

A client-only sales workspace with an assistant-ui thread using the shared AI SDK local preview transport. Suggested questions run actual aggregation functions against `src/data.ts` and update the visible region filter and chart grouping. The dropdown, grouping buttons, chart description, summary table, and source table expose the same data directly.

## Dataset and demo behavior

The 18 checked-in records are fictional sample sales: six months, three regions, revenue in US dollars, and order counts. They are not business performance claims. No network requests, model credentials, or services are needed. The interface identifies this as a deterministic local demo.

Supported queries include region revenue rankings, comparisons, region filters, monthly totals, revenue and order totals, January-to-June growth, and resetting the view. Unknown questions return the supported intents and limitations. The demo does not infer reasons for changes, forecast revenue, or pretend to execute arbitrary natural-language analysis.

## Build contract

`src/main.tsx` exports the application consumed by the generic example bootstrap. `pnpm build` delegates to the shared standalone bundle builder; this app is compiled separately from documentation. `pnpm typecheck` checks the app and shared preview implementation. The parent example manifest controls packaging and full-screen previews.

`node --test scripts/data.test.mjs` runs twelve data contracts on Node 24: known dataset totals, the three suggested questions, reset behavior, comparison precedence, causal questions, unsupported geography/dates/dimensions, region-scoped growth, and unsupported metric combinations. The tests cover the chart's underlying calculations and filter updates.

## Connect a real model

Keep the dataset calculations and view state update functions. Replace the browser-local preview transport with an AI SDK transport targeting your approved server endpoint. Expose narrowly scoped server tools for aggregation and validated filters, then use assistant-ui's tool UI and tool result state to update this view. Preserve provenance and distinguish retrieved results from model interpretation. This example does not include or provision that endpoint.
