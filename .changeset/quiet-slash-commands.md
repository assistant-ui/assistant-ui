---
"@assistant-ui/react": patch
---

fix: keep slash commands scoped to committed renders. search now matches the displayed label, so a command with no explicit `label` is matched on its `/id` fallback rather than only on `id` and `description`.
