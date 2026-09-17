---
"@assistant-ui/react-pi": patch
---

fix: answer pi `select`, `input` and `editor` requests through the tool call's approval

a tool associated `select`, `input` or `editor` request used to project onto `part.interrupt`. the default tool fallback rendered an allow / deny pair there and answered with `{ approved }`, which pi reads as no value, so either button dismissed the request. these requests now project onto `part.approval` the way `confirm` does: `select` as `display: "select"` with one option per choice (option ids are the choice indexes), `input` and `editor` as `display: "text"`, each with the request title as `prompt`. `confirm` now carries its title and message as `prompt` too.

a message waiting on one of these requests reports `requires-action` with reason `tool-calls` instead of `interrupt`, and its tool call no longer carries `interrupt`. a custom tool UI answers with `respondToApproval({ optionId, approved: true })` or `respondToApproval({ text })`, `approved: false` dismisses, and `resume(value)` keeps working. `responseForToolApproval` maps such an answer onto the pi response for a runtime built on `projectPiThreadMessages`.
