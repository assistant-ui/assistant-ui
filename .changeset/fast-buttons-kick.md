---
"@assistant-ui/react": patch
---

Deprecate `autoSend` and `method` in favor of `send` and `clearComposer`

```tsx
<ThreadPrimitive.Suggestion
  prompt="Tell me about React hooks"
  send            // same as autoSend=true
  clearComposer   // same as method="replace", defaults to true
/>
```

When `send` and `clearComposer` are `false`, the suggestion is appended to existing user input
