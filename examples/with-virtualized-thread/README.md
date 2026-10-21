# Virtualized thread example

Renders a 500-message thread with `@tanstack/react-virtual` one row at a time (a user message, an assistant part or a turn end), so an agent turn with dozens of tool calls never becomes one large cell. The runtime is a self-contained external store with a fake streaming reply, so the example runs fully offline with no environment variables.

## Quick start

```sh
pnpm install
pnpm --filter with-virtualized-thread dev
```

## What the example demonstrates

| Concern | File |
| --- | --- |
| Virtualizer over thread rows, padding spacers, `measureElement` | `app/VirtualizedThread.tsx` |
| Rows from `createThreadRowsSelector`, rendered through `ThreadPrimitive.Row`, with a "Worked for" turn footer | `app/VirtualizedThread.tsx` |
| Sticky-bottom auto-follow with a user-scroll disarm guard | `app/VirtualizedThread.tsx` |
| External store runtime with seeded messages and a streaming tail | `app/MyRuntimeProvider.tsx` |
| Deterministic synthetic thread content | `app/seed-messages.ts` |

See the [thread virtualization guide](https://assistant-ui.com/docs/guides/virtualization) for the full walkthrough.
