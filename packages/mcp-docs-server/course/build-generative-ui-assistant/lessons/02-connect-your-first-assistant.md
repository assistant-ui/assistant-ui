# Connect your first assistant

## Goal

Turn the blank page into a working assistant-ui thread backed by a streaming
AI SDK route. The message path is:

```text
Composer → assistant-ui runtime → POST /api/chat → model or fallback → Thread
```

## Agent instructions

Read `runtimes/ai-sdk/v7`, `ui/thread`, and `with-ai-sdk-v7` before editing.
Inspect the learner’s package versions and existing files. Add a client
`RuntimeProvider` using `useChatRuntime` and `AssistantChatTransport`, mount it
from `app/layout.tsx`, and render an application-owned `Thread` from
`app/page.tsx`.

The thread should include an empty state, messages, a composer, send, and stop
controls. Add `app/api/chat/route.ts` using the installed AI SDK model route.
If no API key is configured, provide a deterministic local response so the
learner can verify the interface without creating a key. Keep that fallback
explicit in the lesson explanation; it does not prove a model streamed.

## Verify

Run the development server, send `Hi`, observe the response, and stop a running
response. Run the project typecheck or build. Explain the files changed and the
request/response boundary before offering step 3.
