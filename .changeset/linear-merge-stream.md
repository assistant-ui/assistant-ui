---
"assistant-stream": patch
---

Decoding a stream with many open parts is faster. Merging part streams used to touch every open part on each read and on each new part; it now tracks only the parts that have chunks waiting. Each part keeps its own chunk order and its place after earlier part-starts; chunks from different parts that are ready in the same tick may interleave differently. Updating a part in the message accumulator also makes one copy of the parts array instead of three.
