---
"@assistant-ui/react-ai-sdk": patch
---

fix(react-ai-sdk): pass the initialized remote thread id to prepareSendMessagesRequest

`AssistantChatTransport` resolved the remote thread id from `threadListItem.initialize()` and used it in the default request body, but `optionsEx` spread the original `options`, so a custom `prepareSendMessagesRequest` still received the unresolved local chat id as `options.id`. Integrations that build their request body from `options.id` (e.g. Mastra) sent the wrong id. The settled id is now spread into `optionsEx` so the callback receives it, while the default body and the public callback type are unchanged.