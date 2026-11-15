---
"@assistant-ui/react-streamdown": patch
---

fix: prefix `id` and `name` attributes from markdown with `user-content-`, and keep the sanitize step when custom `rehypePlugins` are passed without `security`
