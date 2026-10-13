---
"generative-frame": patch
---

feat: `createSpecToolkit` from the new `generative-frame/spec/assistant-ui/vue` entry renders `render_spec` calls in an `@assistant-ui/vue` thread with Vue components, deriving the same thread state as the React toolkit: earlier calls with the same title, earlier tool results under `/tools`, saved state, and what a UI shares with the model. `@assistant-ui/vue` and `@assistant-ui/core` are optional peers of that entry.
