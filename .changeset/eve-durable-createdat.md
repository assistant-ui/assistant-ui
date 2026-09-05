---
"@assistant-ui/eve": patch
---

fix: show resumed session history at its real times, not "just now"

`createdAt` now comes from the `meta.at` of each message's own stream event, so a resumed session renders yesterday's messages at yesterday's times. A confirmed message therefore carries eve's server clock rather than the client's first-observation clock, which is what keeps its time stable across reloads and devices; optimistic and failed sends have no durable event and keep the client wall clock.
