---
"@assistant-ui/react-ai-sdk": patch
---

feat(react-ai-sdk): native resumable stream client integration

`AssistantChatTransport` accepts a `resumable: { storage, resumeApi, isFinishEvent? }` option that captures the stream id from the response header, watches the SSE body for the AI SDK `finish` marker so the stored id is cleared on natural completion (cancellation leaves it intact for the next mount), and redirects `chat.resumeStream()` reconnects to `resumeApi`. `createResumableSessionStorage` is the default `sessionStorage`-backed `ResumableClientStorage`. `useChatRuntime` auto-fires `chat.resumeStream()` once on mount when storage already has an id, so adopters drop the manual `useEffect`.
