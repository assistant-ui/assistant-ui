---
"assistant-stream": patch
---

fix: keep partial tool-call args parseable when a negative number is cut before its digits

`fixJson` treated the `-` that opens an array element as a complete value, so a stream cut at `{"a":[-` repaired to `{"a":[-]}`. That is not valid JSON, `parsePartialJsonObject` fell into its catch and returned `undefined`, and callers that fall back to `{}` dropped every field streamed so far until the next delta landed.

The `INSIDE_ARRAY_START` default branch advanced `lastValidIndex` before delegating to `processValueStart`, which deliberately leaves it alone for `-` because a lone minus carries no value yet. Every other value-start site already lets `processValueStart` own that index, which is why `{"a":-` and `{"a":[1,-` truncated correctly and only the first element of an array did not.
