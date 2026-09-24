---
"@assistant-ui/core": patch
"@assistant-ui/ai-sdk": patch
"@assistant-ui/react-ag-ui": patch
"@assistant-ui/react-a2a": patch
"assistant-cloud": patch
---

feat: LangGraph, LangChain, Google ADK and custom external store runtimes under a cloud thread list now store a copy of their settled messages in Assistant Cloud by default, keyed by their backend's message ids, so the dashboard shows the transcript and feedback can rate it; tool interactions recorded in their tool UIs are kept on the copy instead of throwing. a message the cloud refuses, such as one over the size limit, is skipped with a console warning and the later messages are still copied, while a thread it refuses as a whole (deleted, its end user past the plan cap, or refused twice before any message was accepted) stops being copied with one warning. `telemetry: { messages: false }` on the `AssistantCloud` client keeps the copy out, and tool interactions then throw as before. a stored user message counts its end user toward the project's monthly active users.
