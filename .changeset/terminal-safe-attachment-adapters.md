---
"@assistant-ui/core": patch
---

fix: make `SimpleTextAttachmentAdapter` and `SimpleImageAttachmentAdapter` work without `FileReader`. they read files via the browser only `FileReader`, so sending an attachment in a non browser runtime (e.g. `@assistant-ui/react-ink` in a terminal) threw `ReferenceError: FileReader is not defined`. the adapters now feature detect: they keep using `FileReader` when it exists (browser, and React Native whose Blob polyfill provides it) and fall back to `file.text()` / `file.arrayBuffer()` in Node. output is byte identical across all three environments, so `@assistant-ui/react`, `@assistant-ui/react-native`, and `@assistant-ui/react-ink` all keep re-exporting the same core implementation.
