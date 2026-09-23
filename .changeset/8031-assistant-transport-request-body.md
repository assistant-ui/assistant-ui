---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

fix: type the assistant transport request body that `prepareSendCommandsRequest` receives; its fields are no longer `unknown` in `@assistant-ui/react`, and `threadId` is an optional `string`, absent when a resume has no remote id, instead of `string | null`
