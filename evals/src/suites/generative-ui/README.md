# Generative UI

Which answer format do models write best, what does spec mode's lack of computed values cost, and does a model pick the right format when it may choose? Every model answers every task in every format and once in a format it chooses, each answer renders in a headless Chrome, and a separate judge scores the screenshot.

## How it works

Each trial sends one task as the only user message, with the format's system prompt and tools. The system prompt tells the model to answer through the format's tool, and an answer that never calls it counts as an error and renders as the Markdown the user would see instead; tool choice stays `auto` because Opus 5.5 rejects a forced tool call. The `auto` candidate is the exception, since answering in Markdown is one of its choices.

| Format | The model gets | The answer counts as valid when |
| --- | --- | --- |
| `text` | an instruction to answer in Markdown | it is not empty |
| `present` | the `present` tool from `@assistant-ui/generative-ui` with the 35 components of the kit's generative UI element (`styledGenerativeUILibrary`) | every node is a known component with valid props, and the tree renders with `react-dom/server` |
| `spec` | `render_spec` from `generative-frame`, with the catalog `toSpecCatalog` builds from the same 35 components and the catalog's prompt | `render_spec` finds no errors in the patches or the finished spec |
| `frame` | `read_me`, `show_widget`, and `edit_widget` from `generative-frame`, with its widget instructions | the widget is not empty and every edit applies |
| `auto` | the `spec` and `frame` tools, the spec catalog's prompt, and a draft of the rules for choosing between Markdown, a spec, and a widget (`CHOOSING` in `formats.ts`) | the answer is valid in the format it chose |

`present` and `spec` share one vocabulary, so the comparison between them is about the format alone. `auto` leaves out `present`, which spec mode replaces as the declarative format; its scores show whether the draft rules pick a format that serves each task as well as the best fixed one. A tool returns its validation errors to the model, which gets up to two more calls to fix them, the way a host feeds back render problems. The last call's tree, spec, or widget source is the answer.

The answer then renders 680 px wide the way a chat app shows it: Markdown with the kit's text styles, `present` and spec answers with the kit's generative UI element and vocabulary styles (so a `Markdown` node renders formatted, a `Diagram` draws with Mermaid, and a `Map` on Leaflet tiles, as the element documents, with Tailwind compiled over the kit's element sources the way an app that installs it compiles them), and a widget in generative-frame's Safe Content Frame. Any prose the model writes around a tool answer renders as Markdown above and below it, in message order. Before the capture, the page waits for nothing in the answer to be busy (`aria-busy`, as a map is while Leaflet loads) and for it to stop changing for 300 ms, then for its images to load or fail; each wait gives up after five seconds, and a widget gets a fixed 600 ms instead, so a slow tile can still be missing from a screenshot. A script error, a blank render, or a spec that fails to render counts as an error while rendering.

The page is captured in slices 1,000 px tall, since vision models shrink a taller image until its text is unreadable; an answer taller than eight slices is cut off, and the judge is told so.

A fresh judge sees the request, the screenshots of the rendered answer, and any errors left, then scores clarity, usefulness, completeness, and presentation from 1 to 5. The mean of the first three is the answer's score, as in earlier runs; presentation, whether its visual hierarchy and its photos, maps, key figures, or tables serve the content the way a well-designed app would, is reported on its own. Usefulness covers the interaction the request asks for, such as changing the guest count and seeing quantities update; three of the nine tasks need that kind of computed value. A screenshot cannot show what a control does, so a `present`, spec, or frame answer also gives the judge its source, to be read only for what its controls change.

## What it does not measure yet

- Nothing is clicked or typed: the judge sees each answer before any interaction and learns what its controls do from the source.
- Time to first output is when the answer's text or answer tool input starts streaming, not the first paint.
- Only the last tool answer renders: attempts that a repair replaced, which a chat app would still show, are left out.
- Frame mode has no static validation beyond an empty widget or an edit that does not apply.
- One judge grades every model, so expect some bias toward its own vendor's style; rerun with another `JUDGE_MODEL` to check a result.
- The models get no image or place search, so an answer shows photos only when it writes image URLs itself; `examples/with-generative-ui` gives its model a `search_images` tool.

## Tasks

| Task | Asks for | Computed values |
| --- | --- | --- |
| `bike-rear-wheel` | a step-by-step repair guide | no |
| `brisket-planner` | quantities and timings that scale with the guest count | yes |
| `bill-split` | an interactive bill calculator | yes |
| `monty-hall` | an explanation the user can play with | yes |
| `laptop-comparison` | a comparison of several options | no |
| `road-trip` | a multi-day route plan | no |
| `dinner-party` | a dinner plan with a menu, shopping, and timing | no |
| `capsule-wardrobe` | a wardrobe to buy and combine | no |
| `pnw-road-trip` | a ten-day route with places to stay and a budget | no |

## Running

Models are called through the Vercel AI Gateway. Put `AI_GATEWAY_API_KEY` in `evals/.env`, which `pnpm eval` loads, and build the workspace packages the suite imports. Rendering needs Chrome or Chromium (set `CHROME_PATH` when it is not installed in the usual place), and frame answers load generative-frame's Safe Content Frame from `scf.auiusercontent.com`, so a run needs network access.

```bash
pnpm turbo build --filter='@assistant-ui/x-prompt-evals^...'
cd evals
pnpm eval generative-ui                                      # every task, format, and model, 3 trials each
pnpm eval generative-ui bill-split                           # one task
MODELS=openai/gpt-6-astra pnpm eval generative-ui            # one model
CANDIDATES=spec:openai/gpt-6-astra,frame:openai/gpt-6-astra MODELS=openai/gpt-6-astra pnpm eval generative-ui
```

`MODELS` takes comma-separated gateway model ids and defaults to `anthropic/claude-opus-5.5`, `openai/gpt-6-astra`, and `google/gemini-3.1-pro-preview`. `JUDGE_MODEL` defaults to `anthropic/claude-sonnet-5.5`. A full run makes 9 tasks × 5 candidates × 3 models × `TRIALS` answers, plus one judge call for each. A task's trials run a dozen at a time while the browser renders one answer at a time, so a full run with the default 3 trials takes about 40 minutes.

The report lists, per model, each format's share of answers that passed validation, share that raised errors while rendering, repair rounds, scores including presentation, mean score on computed and other tasks, tokens, time to first output, and total time, then each task's mean score and mean presentation by format and how often `auto` chose each format on it, counting an answer tool call that failed before it ran as a choice of its tool's format. Comparing `spec` with `frame` on computed tasks answers the second question, and comparing `auto` with the best format on each task answers the third. Each trial's screenshots, one file per slice, and a JSON file with its answer, errors, scores, and the judge's reason are saved in `results/generative-ui/trials/<task>/`.

## Layout

```
index.ts        the suite: one candidate per model and format
tasks.ts        the nine requests
formats.ts      each format's system prompt, tools, and validation
generate.ts     one answer, with its repair rounds
render.ts       renders an answer in Chrome and captures it
harness.tsx     the page that renders each format
chrome.ts       launches Chrome and drives it over the DevTools protocol
judge.ts        scores a screenshot of the rendered answer (LLM judge)
report.ts       the per-model tables
mock-models.ts  scripted models for the tests
```
