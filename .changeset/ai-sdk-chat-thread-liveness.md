---
"@assistant-ui/ai-sdk": patch
---

fix: `AISDKThreads` chats call the latest `onToolCall`, `onData`, `onFinish`, `onError` and `sendAutomaticallyWhen` passed to it, including on a thread still streaming in the background, instead of the ones captured when the thread was created
