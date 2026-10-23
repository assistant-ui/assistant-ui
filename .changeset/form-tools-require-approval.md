---
"@assistant-ui/react-hook-form": patch
---

fix: ask before assistant form submissions and resets, and omit sensitive form values from model context. A custom `submit_form` or `reset_form` render must handle the approval interrupt and call `resume({ approved })`, or set `requireApproval: false`; `assistant.sensitiveFields` excludes fields the DOM check cannot see.
