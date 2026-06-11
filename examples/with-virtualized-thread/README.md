# Virtualized thread example

Renders a 500-message thread with `@tanstack/react-virtual` so only the turns near the viewport are mounted. The runtime is a self-contained external store with a fake streaming reply, so the example runs fully offline with no environment variables.

## Quick start

```sh
pnpm install
pnpm --filter with-virtualized-thread dev
```

## What the example demonstrates

| Concern | File |
| --- | --- |
| Virtualizer over user turns, padding spacers, `measureElement` | `app/VirtualizedThread.tsx` |
| Per-message rendering through `ThreadPrimitive.MessageByIndex` | `app/VirtualizedThread.tsx` |
| Sticky-bottom auto-follow with a user-scroll disarm guard | `app/VirtualizedThread.tsx` |
| External store runtime with seeded messages and a streaming tail | `app/MyRuntimeProvider.tsx` |
| Deterministic synthetic thread content | `app/seed-messages.ts` |

See the [thread virtualization guide](https://assistant-ui.com/docs/guides/virtualization) for the full walkthrough.
