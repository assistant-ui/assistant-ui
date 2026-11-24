# Generative frame

A chat whose answers can be live UI, drawn while the model streams it, with [generative-frame](https://www.assistant-ui.com/generative-frame/docs) in both of its ways: a spec the model fills in with assistant-ui's generative UI vocabulary, and HTML or SVG it writes into a sandboxed frame. Ask for a plan, a comparison or a calculator, use it in place, and ask for a change to edit the same one.

## Files

| Concern | Where it lives |
|---|---|
| Runtime, widget toolkit, messages, status line, message box | `components/generative-frame.tsx` |
| The gallery a new chat shows | `components/gallery.tsx` |
| The vocabulary's catalog and components | `components/vocabulary.tsx` |
| Icon, tooltip and menu parts | `components/ui.tsx` |
| The chat route | `api/chat/route.ts` |
| The model, and each tile's title, prompt, and spec or widget code | `data.json` |
| Theme, including the chart colors a frame reads | `block.css` |

## Run it

Copy `.env.example` to `.env.local` beside your app's `package.json`, set `OPENAI_API_KEY`, and set `BLOCKS_LIVE_API` to `true`. Without the flag the route answers 404, and without a key it answers 401.

Put your own sign-in and rate limit in front of the route before you deploy it.

## Two ways to draw

- `render_spec` streams JSON patches that build a spec, and the vocabulary's components draw it in the page: cards, facts, tables, charts, tabs, steps and form controls. No model code runs. The catalog and components come from `toSpecCatalog(styledGenerativeUILibrary)`.
- `show_widget` streams HTML or SVG into a Safe Content Frame, for what the components cannot draw. `edit_widget` replays edits on a widget's earlier code.
- `createWidgetToolkit` with `spec: createSpecToolkit(...)` from `generative-frame` gives the thread both, and `useWidgetInstructions` tells the model which to use: a spec for content to scan or act on, such as plans, comparisons, guides and forms, and a frame for tools that calculate, games and drawings. The spec guide goes with every request, so a spec starts without a `read_me` call.
- The tools run in the browser. The route only forwards their schemas with `frontendTools`, and the instructions arrive in `system`. A frame's result waits for it to finish, so the model hears about a widget that failed to draw and can fix it.

## While it streams

- One status line sits under the reply for as long as it runs and no text is being written.
- A spec draws each element as its patch arrives.
- A frame stays closed until its first size report, then eases to each new height as the code arrives. It reads the block's colors from the page and follows light and dark.

## The gallery

A new chat shows a tile for each entry in `data.json`, drawn live and usable in place:

- An entry with `patches` is the spec the model wrote for its `prompt`, kept as it streamed and drawn with the same components as the chat.
- An entry with `code` is a widget's HTML, run in its own frame with `<Widget>` from `generative-frame/react` in the block's theme. Sunlight travel time and Signups by plan are the recorded widgets from the generative-frame demos; the others are what the model wrote for their prompts.

Start sends the entry's prompt, and the chat builds it again. A widget's `sendPrompt(text)` puts the text in the message box.

## What is not kept

The chat lives in memory and is gone on reload.
