---
"assistant-ui": patch
---

`assistant-ui codemod` and `assistant-ui upgrade` keep each file's line endings. On Windows a file with LF line endings came back with CRLF on every line after a codemod changed it, and on Linux and macOS a CRLF file came back with LF.
