---
"@assistant-ui/react-generative-ui": patch
---

fix: A2UI inputs show their bound value and are named by the full binding pointer, and a button's `context` or `functionCall` args bound to an input send what the user entered; `$action` values accept `{ "$field": name }` references resolved when the action fires (by `decodeSubmitData` on Teams, dropped with a warning on Slack), `Input` and `Select` take a `defaultValue` that the Slack and Teams converters map, and a control resets when a re-render changes its initial value
