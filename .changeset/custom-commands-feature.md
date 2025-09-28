---
"@assistant-ui/react": patch
---

feat: Add custom commands support to useAssistantTransportRuntime

Adds the ability to send custom commands through useAssistantTransportRuntime by:
- Introducing a global augmentation pattern via `Assistant.Commands` interface
- Adding `useAssistantTransportSendCommand` hook for sending custom commands
- Supporting custom command types in the transport layer

Users can now extend the Assistant interface to define their own command types:
```typescript
declare global {
  interface Assistant {
    Commands: {
      myCommand: { type: "my-command"; data: string };
    }
  }
}
```