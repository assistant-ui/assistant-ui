---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

fix: exclude reasoning parts from copied message text

`getCopyText` filtered parts with `"text" in part`, which also matched `reasoning` parts (they carry a `text` field), leaking the model's chain-of-thought into the clipboard. Both copy paths now delegate to the canonical `getThreadMessageText`, so copy returns only `type: "text"` content — consistent with the rest of the runtime.
