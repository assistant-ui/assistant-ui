---
"@assistant-ui/react": patch
---

docs: deprecate `useMessagePart*` primitive hooks

adds `@deprecated` JSDoc with `{@link}` migration targets to `useMessagePartText`, `useMessagePartReasoning`, `useMessagePartSource`, `useMessagePartFile`, `useMessagePartImage`, and `useMessagePartData`. these were accidentally skipped when sibling legacy runtime hooks were marked deprecated. they all point to `useAuiState((s) => s.part)` and link to the v0-12 migration guide.
