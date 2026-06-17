# assistant-ui + Eve

This example mounts an Eve agent into a Next.js app with `withEve()` from `eve/next`, then adapts Eve's React hook into assistant-ui with `useEveAgentRuntime()`.

```bash
pnpm --filter with-eve dev
```

The Eve channel is served on the same origin as the Next app, so the browser UI does not need a separate agent URL.
