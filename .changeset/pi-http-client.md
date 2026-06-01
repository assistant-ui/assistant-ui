---
"@assistant-ui/react-pi": patch
---

feat: add `createPiHttpClient` + SSE event source (browser transport)

The browser half of the Pi `PiClient` contract: `createPiHttpClient` talks to a
small HTTP/SSE route layer over a server-side `createPiNodeClient`, and
`PiEventSource` (`createSseDecoder` / `openPiEventStream`) decodes the live event
stream with snapshot-first reconnect. Adds an optional env-seeded `model`
passthrough to the node supervisor (`PiThreadSupervisorOptions.model`). See the
new `examples/with-pi` app.
