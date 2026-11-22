---
"setup-agent": patch
---

`connectCheckout` (and every `setup-agent` command) attaches to the setup over a WebSocket where the runtime has a global `WebSocket` (Node 22 and later), as the setup page already does, so the setup server's Durable Object can hibernate between messages instead of staying awake for an open SSE stream. Node 20 keeps using SSE.
