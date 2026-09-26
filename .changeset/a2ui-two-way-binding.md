---
"@assistant-ui/react-generative-ui": patch
---

fix: A2UI inputs show their bound value and are named by the full binding pointer, and a button's `context` or `functionCall` args bound to an input send what the user entered; `$action` values accept `{ "$field": name }` references resolved when the action fires, falling back to an optional `fallback` (the value the agent sent, for converted surfaces) where no control can be read, such as on Slack or in a component that dispatches `$action` itself, while `decodeSubmitData` resolves them from a Teams card's inputs; `Input` and `Select` take a `defaultValue` that the Slack and Teams converters map, and a control resets when a re-render changes its initial value
