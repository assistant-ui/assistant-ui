---
"@assistant-ui/react-a2a": patch
---

add `fetchOptions` passthrough on `A2AClient` and `useA2ARuntime` so callers can forward `credentials`, `cache`, `mode`, `keepalive`, etc. to the underlying fetch.

```ts
const runtime = useA2ARuntime({
  baseUrl: "https://my-agent.example.com",
  fetchOptions: { credentials: "include" },
});
```

`headers`, `body`, `method`, and `signal` stay internally managed: the four fields are stripped at construction time and cannot leak through even if a caller bypasses the type with an `as RequestInit` cast.
