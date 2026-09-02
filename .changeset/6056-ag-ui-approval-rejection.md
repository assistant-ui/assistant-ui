---
"@assistant-ui/react-ag-ui": patch
---

fix: surface a refused tool-approval decision, and show the gate's own message

a rejected decision now reaches whoever rendered the controls as well as `onError`, so an expired or already-decided gate stays retryable instead of only being reported out of band. an interrupt's `message` is projected onto `approval.prompt` rather than dropped, so the renderer shows the question the gate asked.
