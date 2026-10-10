# Generative UI

Which answer format do models write best, and what does spec mode's lack of computed values cost? Every model answers every task in every format, and a separate judge scores what the user would see.

## How it works

Each trial sends one task as the only user message, with the format's system prompt and tools. The model has to answer through the format's tool (`toolChoice: "required"`), except in `text`.

| Format | The model gets | The answer renders when |
| --- | --- | --- |
| `text` | an instruction to answer in Markdown | it is not empty |
| `present` | the `present` tool from `@assistant-ui/generative-ui` with the default 29 components | every node is a known component with valid props, and the tree renders with `react-dom/server` |
| `spec` | `render_spec` from `generative-frame`, with a catalog of the same 29 components and the catalog's prompt | `render_spec` finds no errors in the patches or the finished spec |
| `frame` | `read_me`, `show_widget`, and `edit_widget` from `generative-frame`, with its widget instructions | the widget is not empty and every edit applies |

`present` and `spec` share one vocabulary, so the comparison between them is about the format alone. A tool returns its validation errors to the model, which gets up to two more calls to fix them, the way a host feeds back render problems. What the judge reads is the last call's tree, spec, or widget source.

A fresh judge reads the request, the answer's source, and any errors left, then scores clarity, usefulness, and completeness from 1 to 5. Usefulness covers the interaction the request asks for, such as changing the guest count and seeing quantities update; three of the six tasks need that kind of computed value.

## What it does not measure yet

- Nothing renders in a browser, so the judge reads source instead of screenshots, frame widgets get no runtime error report, and time to first output is the first streamed token rather than the first paint.
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

Models are called through the Vercel AI Gateway. Put `AI_GATEWAY_API_KEY` in `evals/.env`, which `pnpm eval` loads, and build the workspace packages the suite imports:

```bash
pnpm turbo build --filter='@assistant-ui/x-prompt-evals^...'
cd evals
pnpm eval generative-ui                                      # every task, format, and model, 3 trials each
pnpm eval generative-ui bill-split                           # one task
MODELS=openai/gpt-6-astra pnpm eval generative-ui            # one model
CANDIDATES=spec:openai/gpt-6-astra,frame:openai/gpt-6-astra MODELS=openai/gpt-6-astra pnpm eval generative-ui
```

`MODELS` takes comma-separated gateway model ids and defaults to `anthropic/claude-opus-5.5`, `openai/gpt-6-astra`, and `google/gemini-3.1-pro-preview`. `JUDGE_MODEL` defaults to `anthropic/claude-sonnet-5.5`. A full run makes 6 tasks × 4 formats × 3 models × `TRIALS` answers, plus one judge call for each.

The report lists, per model, each format's render rate, repair rounds, scores, mean score on computed and other tasks, tokens, time to first output, and total time, then each task's mean score by format. Comparing `spec` with `frame` on computed tasks answers the second question.

## Layout

```
index.ts        the suite: one candidate per model and format
tasks.ts        the six requests
formats.ts      each format's system prompt, tools, and validation
generate.ts     one answer, with its repair rounds
judge.ts        scores an answer's source (LLM judge)
report.ts       the per-model tables
mock-models.ts  scripted models for the tests
```
