---
"@assistant-ui/react-pi": patch
---

fix: answer pi `select`, `input` and `editor` requests through the tool call's approval

a tool associated `select`, `input` or `editor` request used to project onto `part.interrupt`. the default tool fallback rendered an allow / deny pair there and answered with `{ approved }`, which pi reads as no value, so either button dismissed the request. these requests now project onto `part.approval` the way `confirm` does: `select` as `display: "select"` with one option per choice (option ids are the choice indexes), `input` and `editor` as `display: "text"`, each with the request title as `prompt`. `confirm` now carries its title and message as `prompt` too. a `select` without choices, or a request kind this client does not know, goes to `usePiHostUiRequests` instead.

a message waiting on any of these requests reports `requires-action` with reason `interrupt` (a `confirm` used to report `tool-calls`), because pi never takes a tool result from the client; a tool call in that message that has not started no longer gets an allow / deny pair that fails on click. a custom tool UI answers with `respondToApproval({ optionId, approved: true })` or `respondToApproval({ text })`, `approved: false` dismisses, and `resume(value)` keeps working. `usePiRuntimeExtras().respondToToolApproval(id, approved)` now dismisses a `select`, `input` or `editor` request on a refusal and rejects an acceptance, instead of sending it a `confirm` answer. `responseForToolApproval` maps an answer onto the pi response for a runtime built on `projectPiThreadMessages`. the `@assistant-ui/react` peer range now starts at `^0.15.18`, the release that added the approval question fields these requests use.
