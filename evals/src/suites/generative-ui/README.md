# Generative UI

Which answer format do models write best, and what does spec mode's lack of computed values cost? Every model answers every task in every format, each answer renders in a headless Chrome, and a separate judge scores the screenshot.

## How it works

Each trial sends one task as the only user message, with the format's system prompt and tools. The system prompt tells the model to answer through the format's tool, and an answer that never calls it counts as an error and renders as the Markdown the user would see instead; tool choice stays `auto` because Opus 5.5 rejects a forced tool call.

| Format | The model gets | The answer counts as valid when |
| --- | --- | --- |
| `text` | an instruction to answer in Markdown | it is not empty |
| `present` | the `present` tool from `@assistant-ui/generative-ui` with the 35 components of the kit's generative UI element (`styledGenerativeUILibrary`) | every node is a known component with valid props, and the tree renders with `react-dom/server` |
| `spec` | `render_spec` from `generative-frame`, with the catalog `toSpecCatalog` builds from the same 35 components and the catalog's prompt | `render_spec` finds no errors in the patches or the finished spec |
| `frame` | `read_me`, `show_widget`, and `edit_widget` from `generative-frame`, with its widget instructions | the widget is not empty and every edit applies |

`present` and `spec` share one vocabulary, so the comparison between them is about the format alone. A tool returns its validation errors to the model, which gets up to two more calls to fix them, the way a host feeds back render problems. The last call's tree, spec, or widget source is the answer.

The answer then renders 680 px wide the way a chat app shows it: Markdown with the kit's text styles, `present` and spec answers with the kit's generative UI element and vocabulary styles (so a `Markdown` node renders formatted, a `Diagram` draws with Mermaid, and a `Map` on Leaflet tiles, as the element documents, with Tailwind compiled over the kit's element sources the way an app that installs it compiles them), and a widget in generative-frame's Safe Content Frame. Each answer is captured once it has stopped changing for 300 ms and its images have loaded, so a map's tiles and a diagram's drawing show. A script error, a blank render, or a spec that fails to render counts as an error while rendering.

The page is captured in slices 1,000 px tall, since vision models shrink a taller image until its text is unreadable; an answer taller than eight slices is cut off, and the judge is told so.

A fresh judge sees the request, the screenshots of the rendered answer, and any errors left, then scores clarity, usefulness, and completeness from 1 to 5. Usefulness covers the interaction the request asks for, such as changing the guest count and seeing quantities update; three of the six tasks need that kind of computed value. A screenshot cannot show what a control does, so a `present`, spec, or frame answer also gives the judge its source, to be read only for what its controls change.

## What it does not measure yet

- Nothing is clicked or typed: the judge sees each answer before any interaction and learns what its controls do from the source.
- Time to first output is when the answer's text or answer tool input starts streaming, not the first paint.
- Frame mode has no static validation beyond an empty widget or an edit that does not apply.
- One judge grades every model, so expect some bias toward its own vendor's style; rerun with another `JUDGE_MODEL` to check a result.

## Tasks

| Task | Asks for | Computed values |
| --- | --- | --- |
| `bike-rear-wheel` | a step-by-step repair guide | no |
| `brisket-planner` | quantities and timings that scale with the guest count | yes |
| `bill-split` | an interactive bill calculator | yes |
| `monty-hall` | an explanation the user can play with | yes |
| `laptop-comparison` | a comparison of several options | no |
| `road-trip` | a multi-day route plan | no |

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

`MODELS` takes comma-separated gateway model ids and defaults to `anthropic/claude-opus-5.5`, `openai/gpt-6-astra`, and `google/gemini-3.1-pro-preview`. `JUDGE_MODEL` defaults to `anthropic/claude-sonnet-5.5`. A full run makes 6 tasks × 4 formats × 3 models × `TRIALS` answers, plus one judge call for each. A task's trials run a dozen at a time while the browser renders one answer at a time, so a full run with the default 3 trials takes about half an hour.

The report lists, per model, each format's share of answers that passed validation, share that raised errors while rendering, repair rounds, scores, mean score on computed and other tasks, tokens, time to first output, and total time, then each task's mean score by format. Comparing `spec` with `frame` on computed tasks answers the second question. Each trial's screenshots, one file per slice, and a JSON file with its answer, errors, scores, and the judge's reason are saved in `results/generative-ui/trials/<task>/`.

## Layout

```
index.ts        the suite: one candidate per model and format
tasks.ts        the six requests
formats.ts      each format's system prompt, tools, and validation
generate.ts     one answer, with its repair rounds
render.ts       renders an answer in Chrome and captures it
harness.tsx     the page that renders each format
chrome.ts       launches Chrome and drives it over the DevTools protocol
judge.ts        scores a screenshot of the rendered answer (LLM judge)
report.ts       the per-model tables
mock-models.ts  scripted models for the tests
```
