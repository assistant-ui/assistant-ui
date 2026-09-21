---
"assistant-stream": patch
---

fix: reject malformed data-stream frame values at the parse boundary instead of crashing or coercing. Frames such as `e:null` or `0:123` that previously passed through now throw in strict mode and are dropped with a log in `strict: false`.
