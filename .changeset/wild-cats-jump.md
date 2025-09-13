---
"@assistant-ui/react": minor
---

feat: add wildcard event support to EventManager

- Added support for wildcard "*" event subscriptions to listen to all events
- Wildcard listeners receive events in format: `{ event: string, payload: any }`
- Updated type definitions to include "*" as a valid event type
- Modified emit method to trigger both specific and wildcard listeners