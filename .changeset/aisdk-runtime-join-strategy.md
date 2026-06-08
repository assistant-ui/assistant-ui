---
"@assistant-ui/react-ai-sdk": patch
"@assistant-ui/core": patch
---

feat: expose `joinStrategy` on `useAISDKRuntime` / `useChatRuntime`

the new AI SDK runtime always merged consecutive `role: "assistant"` UIMessages into a single rendered turn, with no supported way to opt out (the converter accepts `joinStrategy` but the runtime never forwarded it, and `AISDKMessageConverter` is not exported). this follows up on #1633, where the same knob shipped on the legacy `useVercelUseChatRuntime` as `unstable_joinStrategy`. pass `joinStrategy: "none"` to keep proactive or history loaded consecutive assistant messages as separate turns.

core now exports a shared `JoinStrategy` type so the `"concat-content" | "none"` union has a single source of truth across the converter and the runtimes.
