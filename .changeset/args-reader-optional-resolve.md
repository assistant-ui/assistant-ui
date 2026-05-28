---
"assistant-stream": patch
---

fix(assistant-stream): resolve `argsReader.get()` to `undefined` once args close

Awaiting an optional arg that the model never produced (`reader.args.get("optional")`) previously hung forever, because the args stream was never closed and pending handles were never settled. The reader now closes when args streaming finishes, resolving outstanding `get()` calls to `undefined` for absent fields and closing open `streamValues`/`streamText`/`forEach` streams.
