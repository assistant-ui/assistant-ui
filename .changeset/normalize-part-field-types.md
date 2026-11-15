---
"@assistant-ui/core": patch
---

Normalize part fields with the wrong type when messages are converted from `ThreadMessageLike`, including cloud history. A `file` part with a missing or non-string `mimeType` gets `application/octet-stream`, and one whose `data` is not a string is dropped. A url `source` keeps its `title` only when it is a string and is dropped when its `url` is not a string. A document `source` gets an empty `title` and an `application/octet-stream` media type when those are not strings. Text parts whose `text` is not a string are dropped. The stock file and source components also render a generic fallback instead of throwing on such values.
