---
"@assistant-ui/react-devtools": patch
---

fix: contain failed DevTools conversation switches

Custom `DevToolsClient.switchToThread` implementations can reject. React does not observe promises returned from click handlers, so a rejection becomes an unhandledRejection. `useDevToolsClient` now consumes both synchronous throws and rejected promises at the client boundary, matching `createInProcessClient`.
