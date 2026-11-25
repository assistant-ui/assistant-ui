# Notes

## assistant-ui hooks (vs AI SDK UI)

AI SDK UI hands you a hook like `useChat` (messages, input, `sendMessage`) and you build all the UI yourself. In assistant-ui you call one hook to set up the chat, and the ready-made components (Thread, Composer and so on) are already connected to it. You only reach for the other hooks when you build your own pieces.

So they're not the same thing: AI SDK calls the model and streams the reply; assistant-ui is the chat interface, and it can sit on top of AI SDK.

### Set up the chat (closest match to `useChat`)

- `useChatRuntime`: wraps AI SDK's `useChat`, so assistant-ui runs on top of AI SDK.
- `useAISDKRuntime`: for when you already call `useChat` yourself.
- `useLocalRuntime`: you write a function that calls your own backend.
- `useExternalStoreRuntime`: you keep the messages in your own state.
- Others for specific backends: `useLangGraphRuntime`, `useDataStreamRuntime`, `useAssistantTransportRuntime`, `useCloudRuntime`.

### Read the chat or act on it from any component

- `useAui()`: actions, like `aui.composer().send()` or `aui.thread().cancelRun()`.
- `useAuiState(s => …)`: read one piece of state, like whether a reply is running.
- `useAuiEvent(…)`: react to events.

### Teach the model from React

- `useAssistantTool`: registers a tool the model can call.
- `useAssistantToolUI`: draws the result of a tool call.
- `useAssistantInstructions`: adds instructions from a component.

### Build your own message parts

- `useMessagePartText`, `useMessagePartImage`, `useMessagePartReasoning`, and similar.

### Helpers

- `useThreadViewportAutoScroll`, `useMessageTiming`, `useThreadTokenUsage`.
- Voice: `useVoiceState`, `useVoiceControls`.

Full list: the docs' Hooks API reference (`/docs/api-reference/hooks`).
