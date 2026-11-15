---
"assistant-stream": patch
---

Decoding a stream with many parts no longer slows down with each part. Merging part streams used to touch every open part on each read and on each new part; it now tracks only the parts that have chunks waiting. Chunk order is unchanged. Updating a part in the message accumulator also makes one copy of the parts array instead of three.
