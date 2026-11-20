# Generative frame chat

Being built. The scripted preview runs, in six layouts to choose from (`variants/`). This file is still the outline, not a description of the code; it is rewritten once a layout is picked.

A chat where the assistant answers with live widgets: small HTML and SVG apps it writes while it streams, each one rendered in a sandboxed frame inside the thread. Ask for a tip splitter, a loan chart or a quiz, and it appears under the reply, works in place, and can be changed by asking again.

It is built on [assistant-ui](https://www.assistant-ui.com) and [generative-frame](https://www.assistant-ui.com/generative-frame/docs). The preview answers from a script, so it runs without a key or a server.

## What it will do

- **Widgets that stream.** `show_widget` code renders in a `<Widget>` as it arrives. Finished elements stay put, new ones fade in, and scripts run once the code is complete. Before any code arrives, the first loading message shows as a status line.
- **Edits in place.** Asking for a change calls `edit_widget`, which replays the edit against the widget's earlier code in the thread, so the same widget updates instead of a new one appearing below.
- **Widgets that talk back.** A widget's `sendPrompt(text)` puts text in the composer for you to review and send, and `openLink(url)` opens a page through the host, never from inside the frame.
- **Your theme in the frame.** The block's tokens become CSS variables inside each frame and follow the light and dark switch live.
- **Errors the model sees.** A widget that throws, or renders blank, reports it back, and the model can fix it.
- **Plain answers too.** Markdown for an answer read once, a widget for anything that calculates or draws.

## Planned files (8 of 25)

| File | What it will hold |
| --- | --- |
| `page.tsx` | The runtime: a scripted model that streams `show_widget` and `edit_widget` calls from `data.json`, and the widget toolkit. |
| `layout.tsx` | The Geist fonts and the block's root element. |
| `generative-frame-chat.tsx` | The thread, messages, composer and welcome screen, built on assistant-ui primitives. |
| `generative-frame-chat.css` | The theme tokens, light and dark, scoped to the block; the same tokens feed the frames. |
| `data.json` | The suggestions, the scripted replies, and the recorded widget code each one streams. |
| `api/chat/route.ts` | The chat route for a real model, with the widget tools and their instructions. Off unless `BLOCKS_LIVE_API` is `true`. |
| `README.md` | This file, rewritten once the block is built. |
| `.env.example` | `OPENAI_API_KEY` and `BLOCKS_LIVE_API`. |

`components/` and `lib/` only if a file gets too long.

Today the folder has 14 files. `components/ui.tsx`, `lib/widgets.tsx` and the six layouts in `variants/` are there; `api/chat/route.ts` and `.env.example` are not written yet, and the chat lives in `variants/thread.tsx`.

## assistant-ui pieces it will use

- `createWidgetToolkit` and `useWidgetInstructions` from `generative-frame/assistant-ui`, registered with `AuiConfig({ tools: Tools({ toolkit }) })`.
- `useAssistantUiThemeTokens` to hand the block's theme to the frames.
- `ThreadPrimitive`, `MessagePrimitive.Parts`, `ComposerPrimitive`, `AuiIf`, `useAuiState`.
- In the route: `frontendTools`, `convertToModelMessages`, `streamText`, `createUIMessageStreamResponse`.

## The scripted preview

The script matches a message against the replies in `data.json` and streams the recorded `widget_code` in chunks, as a model would, so the widget really builds up on screen. It knows only its suggestions and says so for anything else.

## Open questions

- Spec mode as well (`render_spec` with the block's own components), or widgets only?
- Which three or four widgets the suggestions show.
- Chat list in a sidebar, or one thread.
