---
"@assistant-ui/react-markdown": patch
"@assistant-ui/react-streamdown": patch
---

serve the preprocess helpers from one source: `@assistant-ui/react-markdown/preprocess` is a new subpath, and `@assistant-ui/react-streamdown` re-exports the same functions instead of carrying a copy
