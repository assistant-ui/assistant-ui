---
"@assistant-ui/react-google-adk": patch
---

fix: list only unanswered requests in `useAdkToolConfirmations`, `useAdkAuthRequests` and session snapshots, derived from the `adk_request_confirmation` and `adk_request_credential` calls in the thread, so a session load no longer lists settled requests, a later send no longer drops unanswered ones, and a confirmation no longer appears twice. an auth request's `toolCallId` is now the id of its `adk_request_credential` call, the only id ADK accepts a credential reply on (it was the gated tool call's id with ADK JS), and `authConfig` is also read from camelCase args.
