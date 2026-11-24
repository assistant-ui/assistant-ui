# Tasks

Scheduled tasks made by describing them, built from assistant-ui primitives: a schedule in the sidebar, each task's runs on the page, and a message box that is always at the foot.

## Files

| Concern | Where it lives |
|---|---|
| Runtime, schedule, page, messages, message box | `components/tasks.tsx` |
| The sidebar that holds the schedule, shared by the blocks | `../chat-sidebar.tsx` |
| A task up close, and the receipt a tool call leaves in the chat | `components/task.tsx` |
| Tasks, runs, the schedule and the open task | `components/store.ts` |
| The person at the foot of the sidebar, usage | `components/user.tsx` |
| Icon, tooltip and menu parts | `components/ui.tsx` |
| The tools the model calls | `toolkit.tsx` |
| The chat route, and the route that carries out a run | `api/chat/route.ts`, `api/run/route.ts` |
| Model name and example prompts | `data.json` |
| Theme | `block.css` |

## Run it

Wrap your Next.js config with `withAui` from `@assistant-ui/next`, which compiles `toolkit.tsx`. Copy `.env.example` to `.env.local` beside your app's `package.json`, set `OPENAI_API_KEY`, and set `BLOCKS_LIVE_API` to `true`. Without the flag the routes answer 404, and without a key they answer 401.

Put your own sign-in and rate limit in front of the routes before you deploy them.

## How a task is made and run

- The message box talks to the chat route. With every message the model is told the local time, the tasks as they stand and which one is open.
- The model calls `create_task`, `update_task`, `delete_task` or `run_task`. Each runs in the browser, changes the store, and draws a receipt in the chat that opens the task.
- Tasks are kept in the browser's local storage, so they are there after a reload.
- Every 20 seconds the page runs each task whose time has come: it posts the task's instruction to the run route, which can search the web, and keeps the answer under the task.
- A task whose time passed while the page was closed runs once when the page opens. Nothing runs while it is closed; use your own scheduler for that.

## What is not kept

The chats live in memory and are gone on reload. Each task keeps its last 20 runs.
