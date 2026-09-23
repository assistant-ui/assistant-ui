---
"@assistant-ui/core": patch
"@assistant-ui/ai-sdk": patch
"@assistant-ui/react-pi": patch
---

feat: let a tool approval question declare that it accepts a dismissal

`ToolCallMessagePart.approval` gains an optional request field, `dismissible`. a question (`display: "select"` or `"text"`) offers no refusal by default, because the kit never fabricates one the host did not ask for; a host that records a dismissal sets `dismissible: true` and the default tool fallback renders a Dismiss control that sends `{ approved: false }` with no answer attached. the fallback also submits a text answer as typed, an empty one included, instead of gating Send on visible text; a host that cannot record an empty answer rejects the response and the controls come back with its error.

`@assistant-ui/react-pi` projects Pi `select`, `input` and `editor` requests as dismissible, since Pi resolves a cancelled request with `undefined` and the runtime already maps `approved: false` to that dismissal. `@assistant-ui/ai-sdk` reads `dismissible` from the `approvalDescriptor` like the other request fields.
