# assistant-ui SEO Analysis

> Source: Ahrefs (project 7619674), pulled 2026-05-08
> Scope: improve organic discovery for assistant-ui.com (especially /docs/)

## Headline Numbers

- **2M monthly npm downloads** (product adoption)
- **1.2K monthly organic clicks** (search discovery) → **~1,600× gap** between users finding us via npm/word-of-mouth vs. via search
- **Only ~50 monthly clicks land on /docs/*** — docs are essentially invisible to Google
- Ahrefs sees only **12 indexed pages** with any organic traffic

## Top Pages (Top 12)

| # | URL | Traffic/mo | Top KW | KW vol | Notes |
|---|---|---|---|---|---|
| 1 | / | 998 | "assistant ui" | 600 | Brand term, 83% of all traffic |
| 2 | /examples/chatgpt | 17 | "chatgpt clone" | 200 | |
| 3 | /examples | 17 | "ai assistant ui" | 100 | |
| 4 | /tw-shimmer | 13 | "shimmer animation" | 100 | Off-topic accidental |
| 5 | /docs | 12 | "assistant ui" | 600 | Brand only |
| 6 | /docs/copilots/motivation | 10 | "assistant ui" | 600 | **AI-flagged High** |
| 7 | /docs/guides/tools | 10 | "assistant ui" | 600 | Brand only |
| 8 | /showcase | 10 | "assistant ui" | 600 | Brand only |
| 9 | /docs/ui/thread | 5 | "threads ui" | — | |
| 10 | /docs/ui/thread-list | 5 | "threadlist" | — | |
| 11 | /examples/mem0 | 5 | "memory ui" | — | |
| 12 | /docs/ui/streamdown | 5 | "streamdown" | 800 | Library brand term |

**Headline diagnosis**: docs pages are ranking only for the brand term "assistant ui" as secondary results. Google has no semantic signal that a given doc page is *about* anything specific. Zero traffic from high-intent dev queries (e.g., "react chat ui library", "ai chatbot component", "streaming chat ui").

---

## Phase 1: Organic Keywords — Striking Distance

> Goal: find queries where pages rank in positions 4–30 — small content tweaks can push to top 3.

**Status**: ✅ done

### Top winnable keywords (sorted by ROI)

Format: `keyword | volume/mo | KD | position | current traffic | ranking page`

**🟢 High-leverage (low KD, near top of page 1):**
| Keyword | Vol | KD | Pos | Page |
|---|---|---|---|---|
| `chat ui` | 800 | 9 | 4 | / |
| `react chat ui` | 200 | 2 | 6 | / |
| `chat ui react` | 90 | 9 | 4 | / |
| `chat ui examples` | 50 | 4 | 9 | /examples |

→ Combined ~1,140/mo with trivial difficulty. Just by pushing these to top 3 we likely net 300–500 extra clicks/mo.

**🟡 Cluster: "chatbot ui" (multiple variants, all to homepage)**
| Keyword | Vol | KD | Pos |
|---|---|---|---|
| `chatbot ui` | 1300 | 26 | 16 |
| `chatbot ui` | 800 | 41 | 9 |
| `chatbot ui` | 200 | 39 | 7 |
| `chatbot ui` | 150 | 37 | 7 |
| `chatbot ui` | 150 | 39 | 8 |
| `chat bot ui` | 300 | 41 | 7 |
| `ui chatbot` | 100 | 39 | 4 |

→ Total ~3K/mo. The repeated entries are different SERPs (locations/SERP features). All point to homepage. A dedicated cluster page (e.g. `/docs/concepts/chatbot-ui` or `/chatbot-ui`) targeting this term + interlinked from homepage could 3–5× docs traffic.

**🟡 Higher difficulty but high volume:**
| Keyword | Vol | KD | Pos |
|---|---|---|---|
| `chat ui` | 500 | 38 | 5 |
| `chat interface` | 300 | 49 | 5 |
| `ai chat interface` | 150 | 49 | 4 |
| `ai assistant` | 900 | 92 | 20 | (KD 92 — skip)

**🔴 Far-rank but huge volume (would need new dedicated content):**
| Keyword | Vol | KD | Pos | Note |
|---|---|---|---|---|
| `chatgpt interface` | 2000 | 88 | 34 | Hard, but a guide page on building ChatGPT-like UIs would target this |
| `langgraph github` | 1800 | 24 | 37 | We're ranked because LangGraph is in our docs/examples — could create a dedicated /docs/integrations/langgraph |
| `shadcn` | 1300 | 56 | 36 | We use shadcn — we rank as adjacent. A "shadcn chat" page would convert |
| `mastra` | 800 | 19 | 46 | Same pattern — Mastra integration page would help |
| `artifacts examples` | 600 | 0 | 48 | **KD 0** — basically uncontested. Create dedicated /examples/artifacts |

### Critical structural observation

**99% of organic traffic lands on `/` (homepage).** Of 33 striking-distance keywords, only **5** point to `/docs/*` or `/examples/*`, and those 5 are accidental brand-name matches (streamdown, threadlist, threads ui, mem0, shimmer). Docs pages have zero topical authority — they don't rank for intent-driven queries.

The homepage does all the SEO heavy lifting because it has H1 = "assistant-ui" and is the only well-linked page. Docs pages are linked only from the docs nav, lack distinctive titles, and Google has no semantic signal to differentiate them.

### Action items (Phase 1)

1. **Title-tag rewrite across all /docs/* pages** — every doc currently competes only on the brand term. Each page needs an intent-bearing title.
2. **Create cluster landing pages** for top intents:
   - `chatbot ui` cluster → dedicated page
   - `react chat ui` cluster → dedicated page
   - `chatgpt interface` → "How to build a ChatGPT-like UI in React" guide
   - Integration pages: LangGraph, Mastra, shadcn-chat
3. **`/examples/artifacts`** — KD 0, vol 600, currently far-rank. Almost free win.
4. **`/tw-shimmer` page** — currently pulls 13 clicks/mo on KD 0–1 keywords. Either delete (off-brand noise) or transform into a "loading states for AI chat" guide that links into the product.

---

## Phase 2: Content Gap vs Competitors

> Goal: identify high-volume keywords competitors rank for but we don't.

**Status**: 🟠 blocked by Ahrefs paywall — Competitive Analysis report and per-competitor Site Explorer both require a higher Ahrefs plan than the current one (free/Lite). Domains we don't own can't be inspected.

### Identified competitor set (from Organic Competitors report)

Direct (developer-focused chat/AI UI):
- **chatbotui.com** — most direct overlap (52.1%), but small (290 traffic/mo)
- **librechat.ai** — open-source ChatGPT clone, AS 70, 8.9K traffic
- **getstream.io** — chat SDK, AS 75, 42K traffic — strongest in the space
- **shadcn.io** — UI components, AS 20, 6.8K traffic — adjacent

Manually added (known competitors, not auto-detected):
- **copilotkit.ai** — direct React AI copilot competitor
- **sdk.vercel.ai** — Vercel AI SDK docs
- **sendbird.com** — chat infrastructure (15K traffic)

### Inferential gap analysis (will validate later if user upgrades)

Based on industry knowledge, these queries almost certainly drive traffic to competitors but not to us:

| Likely query | Est. intent fit | Why we miss it |
|---|---|---|
| `vercel ai sdk` | very high | We don't have a /docs/integrations/vercel-ai-sdk page (or it's underweight) |
| `langchain react` | high | No React+LangChain integration page targeting this |
| `langgraph ui` / `langgraph chat` | high | Currently rank pos 37 for "langgraph github" — uncaptured demand |
| `streaming chat ui` | very high | Core product capability not landing-paged |
| `ai chat ui library` | very high | No page with this exact framing |
| `react chatbot component` | high | Generic component-library framing missing |
| `generative ui react` | medium-high | Vercel AI's generative UI is hot, we don't have parallel content |
| `chatgpt clone tutorial` | medium-high | We have /examples/chatgpt but no how-to-build content |
| `open source ai chatbot` | high | Listicle bait — should appear in roundups |
| `ai assistant component` | medium | Brand-adjacent, no targeted page |
| `tool use react chat` | medium | Tool calling is a core feature, no SEO landing |
| `agent ui` / `ai agent ui` | medium | Trending term, we have agentic features but no SEO page |

**Note**: To get verified data, the user would need an Ahrefs Standard plan (~$199/mo) or use a free alternative like Google Search Console (which gives you our own data only) + manual SERP inspection.

---

## Phase 3: Site Audit

> Goal: find technical/on-page issues that suppress rankings.

**Status**: ✅ done

### Crawl summary

- 1,376 internal URLs crawled
- **Health Score: 86** ("Good")
- 681 URLs clean, 586 with errors
- 1,255 errors, 129 warnings, 799 notices

### Issues by impact tier

#### 🔴 Tier 1 — High-impact, real, fixable

**1. 240 pages with meta description "too short"** (and 9 missing entirely)
- Verified: `/tap/docs/introduction` ships `<meta name="description" content="tap: Hooks for Reactive Resources">` — only 35 chars.
- Source: every MDX `description: ...` frontmatter is one short sentence. Ahrefs flags <70 chars as too short; Google prefers 120–160 for SERP snippet fit.
- **Impact**: ~5–10% loss in organic CTR across all docs pages.

**2. 8 pages where Google rewrote our title** (page-and-SERP-titles-do-not-match)
| URL | Our `<title>` | Google's SERP title | Top KW | Pos |
|---|---|---|---|---|
| /tw-shimmer | "tw-shimmer by assistant-ui \| assistant-ui" | "tw-shimmer" | shimmer animation | 7 |
| /docs | "Introduction \| assistant-ui" | "Introduction" | assistant ui | 1 |
| /examples | "Examples \| assistant-ui" | "Examples" | ai assistant ui | 7 |
| /docs/ui/thread | "Thread \| assistant-ui" | "Thread" | threads ui | 5 |
| /docs/ui/streamdown | "Streamdown \| assistant-ui" | "Streamdown" | streamdown | 4 |
| /examples/chatgpt | "ChatGPT Clone \| assistant-ui" | rewritten | chatgpt clone | dropping |

When Google rewrites your title, it's saying "yours isn't useful enough." This is the SAME root cause as Phase 1's "everything ranks for brand only": titles carry zero topical signal.

- Source: `apps/docs/app/docs/[[...slug]]/page.tsx:124` returns `title: page.data.title` (raw, e.g. "Thread"); `apps/docs/app/layout.tsx:32` template `"%s | assistant-ui"`.
- Sample MDX frontmatter: `title: Thread` / `title: Tools` / `title: Streamdown` — single generic words.

**3. /examples/chatgpt dropped ~50 monthly clicks** (85 → 35 in latest snapshot)
- Real working page that lost half its traffic. Possibly a Google algo shift around AI-content detection (note Ahrefs flags `/docs/copilots/motivation` as "AI Content Level: High"). Worth a manual SERP check + content refresh.

#### 🟡 Tier 2 — Real but lower impact

**4. 259 pages with incomplete Open Graph tags** (+ 7 with no OG, 7 with no Twitter card)
- Likely the same `createOgMetadata()` helper isn't covering all pages. Affects social-share appearance, not Google rankings.

**5. 11 pages with only one incoming internal link**, **1 orphan page** (no incoming links at all)
- These pages are essentially invisible to Google's crawler authority flow. Add internal links from related/popular pages.

**6. 6 pages dropped out of Top 10 since previous crawl**
- /pricing (-4 traffic), /examples (-5), /examples/chatgpt (-50 — same as above)

**7. 15 indexable pages not in sitemap**
- Sitemap is incomplete. Should include every doc page that returns 200 + is indexable.

**8. 7 duplicate pages without canonical** — all on `accounts.assistant-ui.com` (sign-up/sign-in OAuth variants).
- These auth pages should have `<meta name="robots" content="noindex">` since they shouldn't rank anyway. Out of scope for docs work but easy hygiene.

#### 🟢 Tier 3 — False positives / ignore

**9. 34 "4XX page" + 49 "Page has links to broken page"**
- All checked URLs return **200 in production** (verified with curl, including AhrefsBot UA). The audit data is stale — likely Ahrefs crawled mid-deploy or before `/tap/docs/*` routes shipped. Trigger a fresh crawl in Ahrefs UI to clear these. Not a real issue.

**10. 173 external 3XX, 41 external 4XX, 265 internal links to redirects**
- External: not our problem. Internal redirects: minor crawl waste — only fix if there's a pattern (e.g. `/docs/old-name` → `/docs/new-name` chains).

---

## Recommendations & Action Items

> Prioritized for impact ÷ effort. Phase numbers refer to where each finding originated.

### 🚀 Sprint 1: Immediate, low-effort, high-impact (1–2 days)

**A. Trigger fresh Ahrefs crawl** to clear stale 4XX flags before they pollute future analysis.

**B. Rewrite docs `<title>` template to be intent-bearing** [Phase 3.2 + Phase 1]

The fastest single change: append a short intent phrase to every doc title. Two options:

**Option 1 (light)** — change the layout template:
```ts
// apps/docs/app/layout.tsx:32
title: {
  template: "%s | React AI Chat - assistant-ui",  // was "%s | assistant-ui"
  default: "assistant-ui — React Components for AI Chat",
}
```
This alone makes every doc page advertise "React AI Chat" in the title.

**Option 2 (better)** — also expand individual MDX titles:
- `title: Thread` → `title: Thread Component`
- `title: Tools` → `title: Tool Calling`
- `title: Streamdown` → `title: Streamdown Markdown Renderer`
- `title: Tools` → `title: Tool Calling in React Chat UI`

Combined with Option 1, you get: "Tool Calling in React Chat UI | React AI Chat - assistant-ui" — Google has plenty to match against intent queries.

**C. Rewrite all docs MDX `description:` to 120–160 chars** [Phase 3.1]

Current `description: "The main chat container with messages, composer, and auto-scroll."` (62 chars) → 

`description: "Build streaming AI chat in React with Thread — the assistant-ui container that handles messages, composer, scroll, and accessibility out of the box."` (158 chars)

Pattern: lead with the search-intent phrase, end with the brand. ~30 docs files; can be batched via a single agent pass through `apps/docs/content/docs/`.

**D. Add `noindex` to `accounts.assistant-ui.com/sign-up` and `/sign-in`** [Phase 3.8]
- Out of this repo (separate auth subdomain), but worth flagging to whoever owns it.

### 🎯 Sprint 2: New content for striking-distance wins (1 week)

**E. Create `/examples/artifacts`** [Phase 1] — KD 0, vol 600, currently far-rank. **Lowest-difficulty net-new traffic available.**

**F. Build a /docs hub page (or homepage section) targeting "react chat ui"** [Phase 1]
- Currently /docs ranks #1 for "assistant ui" (brand) but with weak title "Introduction"
- Position 6 for "react chat ui" KD 2 (vol 200) on the homepage — both pages should have a clear "react chat ui" landing flow

**G. Investigate /examples/chatgpt traffic loss** [Phase 3.3]
- Manual SERP check on "chatgpt clone" — see what now ranks above us
- Refresh the page content, tighten the title to e.g. "Build a ChatGPT Clone in React (Open Source) | assistant-ui"
- Add more depth: setup steps, code, screenshots, working demo embed

### 🌱 Sprint 3: Content depth + cluster expansion (2–4 weeks)

**H. Cluster pages for top-volume intents** [Phase 1 + Phase 2]:
- "Chatbot UI" landing page (vol ~3K total across variants)
- "AI Chat Interface" landing page
- "Streaming Chat UI" guide (core product strength, no SEO presence)

**I. Integration pages targeting branded long-tail** [Phase 1 far-rank + Phase 2 inferred gap]:
- /docs/integrations/langgraph (we rank pos 37 for "langgraph github" by accident — turn that into a real page)
- /docs/integrations/vercel-ai-sdk (we should rank for "vercel ai sdk" given how many users use both)
- /docs/integrations/mastra
- /docs/integrations/shadcn (probably exists — check title/depth)

**J. Internal linking pass** [Phase 3.5]
- Every doc page should be linked from at least 3 other doc pages
- Add a related-content widget (manual curation > auto similarity for SEO value)
- Cross-link the homepage to top docs cluster pages

**K. AI-content review of `/docs/copilots/motivation`** [Phase 3 flag]
- Ahrefs flags it "AI Content Level: High". Either rewrite by hand or accept the demotion and consider unpublishing if traffic is dropping.

### 📈 Sprint 4: Ongoing measurement

**L. Add Google Search Console** if not already (free, fills Ahrefs's gap on free plan)

**M. Rerun Ahrefs analysis monthly** — track:
- Total organic clicks (baseline 1.2K → target 5–10K)
- /docs/* share of total traffic (baseline ~4% → target 30%+)
- Striking-distance keywords moved into Top 3 (baseline ~5/mo → target 15+)

---

---

## Implementation Log

### Sprint 1 — completed 2026-05-08

**Layout title template** (`apps/docs/app/layout.tsx`)
- `title.template`: `"%s | assistant-ui"` → `"%s — assistant-ui (React Chat UI for AI)"`
- `title.default`: `"assistant-ui"` → `"assistant-ui — React Chat UI for AI Apps"`
- Site description: `"The TypeScript/React library for AI Chat"` → `"Open-source React components and runtimes for building AI chat — ChatGPT-style UIs, copilots, and agents in TypeScript with streaming, tools, and persistence."`

**MDX frontmatter rewrites** (12 files):

| File | Title before | Title after |
|---|---|---|
| `content/docs/(docs)/index.mdx` | Introduction | React AI Chat Documentation |
| `content/docs/ui/thread.mdx` | Thread | Thread Component |
| `content/docs/ui/thread-list.mdx` | ThreadList | Thread List Component |
| `content/docs/ui/streamdown.mdx` | Streamdown | Streamdown Markdown Renderer |
| `content/docs/guides/tools.mdx` | Tools | Tool Calling |
| `content/docs/integrations/index.mdx` | Integrations | AI Chat Integrations |
| `content/docs/integrations/frameworks/ai-sdk.mdx` | Vercel AI SDK | Vercel AI SDK Integration |
| `content/docs/runtimes/ai-sdk/overview.mdx` | Overview | Vercel AI SDK Runtime |
| `content/docs/runtimes/langgraph/overview.mdx` | Overview | LangGraph UI Runtime |
| `content/docs/runtimes/langchain.mdx` | LangChain useStream | LangChain React Runtime |
| `content/examples/index.mdx` | Examples | React AI Chat Examples |
| `content/examples/chatgpt.mdx` | ChatGPT Clone | ChatGPT Clone Example |
| `content/examples/artifacts.mdx` | Artifacts | Claude Artifacts Example |

All descriptions extended to 120–160 chars, lead with intent phrase, end with brand context.

### Remaining work (not yet implemented)

- Trigger fresh Ahrefs crawl (manual UI action)
- Investigate `/examples/chatgpt` traffic regression — manual SERP check on "chatgpt clone" needed
- Sprint 2/3 content work (cluster pages, `/examples/artifacts` content depth, internal linking)
- Add `noindex` to `accounts.assistant-ui.com/sign-up` and `/sign-in` (separate codebase)
- Manual review of `/docs/copilots/motivation` for AI-content flagging
- Apply same title/description pattern to remaining ~80 doc MDX files (long-tail, lower urgency)

### Validation

- Schema check: `apps/docs/source.config.ts` uses fumadocs `frontmatterSchema` — only requires title/description as strings, no length constraints, all changes valid.
- OG image: `apps/docs/lib/og.ts` URL-encodes title/description into the API; longer descriptions are fine.
- Build/typecheck: not yet run after these changes.

---

## Open questions / unknowns

1. **Content Gap report is paywalled** — to validate the inferential gap analysis (Phase 2), would need an Ahrefs Standard plan or equivalent. Alternatively: Google Search Console + manual SERP inspection of competitors.
2. **The 6 "dropped from top 10" pages** — Ahrefs shows the previous-vs-current numbers but doesn't tell us which keywords specifically were lost. Worth a manual GSC pull if available.
3. **AI Content flagging** — `/docs/copilots/motivation` was flagged "High" — need human review of whether the page reads as AI-generated and rewrite.
4. **Title rewrite tradeoff** — branded titles get higher trust click-through; intent-rich titles get more impressions. Recommendation: A/B test if traffic permits, or accept the impression-side bet (which is what we need given low absolute volume).

---

## Recommendations & Action Items

(to be filled in after data collection)
