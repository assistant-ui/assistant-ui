---
"@assistant-ui/react-generative-ui": patch
---

add `ActionRegistry` and wire `$action` dispatch end to end. `createActionRegistry(handlers)` maps `$action.type` to a handler; omit `actions` for a read-only render where `$dispatch` stays un-injected and interactive clicks are silent. the vocabulary's `Button`/`Select`/`Input`/`DatePicker` attach real event handlers that fire `$dispatch($action)`, merging the user's runtime value into the payload under the reserved `$input` key so a model-supplied `value` is never clobbered; an unknown action type degrades to a no-op with a dev warning rather than throwing. HITL resume-value typing is left as `unknown` (IR doc open question #2); the resume value reaching the runtime is a follow-up.