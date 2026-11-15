---
"@assistant-ui/core": patch
---

`fromThreadMessageLike` (used for `convertMessage` and `initialMessages`) now drops file, image and source parts with fields of the wrong type, using the same rules as the local storage and cloud history readers, so a malformed part is dropped the same way on every runtime. Those readers now also drop a file whose `filename` is not a string or whose `sourceType` is not `"url"` or `"id"`, an image whose `filename` is not a string, a url source whose `title` is not a string, and a document source whose `filename` is not a string. Text parts whose `text` is not a string are dropped, and a system message whose text is not a string gets an empty text. A reasoning part whose `text` is not a string gets an empty `text`, and a `unstable_summary` that is not a string is removed. A `null` `filename`, `title` or `sourceType` counts as absent: the part is kept and `fromThreadMessageLike` removes the `null`.
