---
"@assistant-ui/core": patch
---

fix: the `Artifacts` resource now completes artifact tool calls itself when an
operation reaches a terminal status, instead of relying on a mounted tool-call
render UI to call `addResult`. Artifact tools have no server-side `execute`, so
the result (and therefore the model's auto-continue) previously never landed
when the card was unmounted (e.g. inside a collapsed tool group). The resource
maps the terminal status to a tool result and submits it via the thread runtime
exactly once per tool call, decoupling loop completion from the view.
