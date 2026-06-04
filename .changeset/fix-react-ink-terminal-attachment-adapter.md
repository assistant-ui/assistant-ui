---
"@assistant-ui/react-ink": patch
---

fix(react-ink): make `SimpleTextAttachmentAdapter` and `SimpleImageAttachmentAdapter` work in the terminal. react-ink previously re-exported core's implementations, which read files via the browser-only `FileReader` and threw `ReferenceError: FileReader is not defined` on send in Node. react-ink now ships its own implementations with the same names, API, and output format, built on `file.text()` / `file.arrayBuffer()`. Core keeps `FileReader` since React Native's File polyfill supports it but not `file.text()`.
