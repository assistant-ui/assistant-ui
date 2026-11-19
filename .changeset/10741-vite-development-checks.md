---
"@assistant-ui/core": patch
"@assistant-ui/tap": patch
---

Development warnings and tap checks now work in browser builds where the bundler replaces `process.env.NODE_ENV` without defining a `process` global.
