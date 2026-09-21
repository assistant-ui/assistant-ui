---
"assistant-stream": patch
"@assistant-ui/core": patch
---

fix: carry a tool result's `modelContent` across the data-stream wire and aui/v0 persistence

The data-stream encoder dropped `modelContent` from the tool result frame and the aui/v0 cloud encoder dropped it from the stored tool-call part, so a tool that returned a large UI blob plus a short model summary sent the blob to the model, and a reloaded cloud thread disagreed with the localStorage boundary, which kept the field.
