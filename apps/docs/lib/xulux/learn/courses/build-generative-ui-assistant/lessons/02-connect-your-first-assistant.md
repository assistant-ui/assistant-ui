# Connect your first assistant

This stage connects an assistant-ui conversation surface to a streaming AI SDK route.

Explain the responsibility of each part:

- `Thread` renders the conversation, empty state, messages, composer, and streaming controls.
- `RuntimeProvider` connects that interface to conversation state and transport.
- `app/layout.tsx` mounts that provider around the application.
- `POST /api/chat` receives the messages, calls the model, and returns a streamed UI response.

Trace one message through the application:

```text
Composer → assistant-ui runtime → POST /api/chat
  → AI SDK model → streamed UI message → Thread
```

Ask the learner to send “Hi,” observe the response stream, and stop one response while it is running. Keep the explanation focused on this boundary; suggestions and tools come later.
