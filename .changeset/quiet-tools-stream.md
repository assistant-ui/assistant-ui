---
"assistant-stream": patch
---

fix: surface preliminary tool outputs instead of dropping them

the ui message stream decoder now emits every `tool-output-available` chunk marked `preliminary` as an interim `result` with `isPreliminary: true`, the tool call stays open until its final output, and the accumulator keeps the call running with the interim value. the data stream protocol carries the same marker on `a:` lines, so a server on this version streaming interim results to a client on an older `assistant-stream` settles that client's tool call on the first interim value; keep both sides on the same version.
