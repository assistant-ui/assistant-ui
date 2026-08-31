---
"@assistant-ui/eve": patch
---

fix: show resumed session history at its real times, not "just now"

`createdAt` now comes from the `meta.at` of each message's own stream event, so a resumed session renders yesterday's messages at yesterday's times. Messages with no durable event (optimistic sends) keep the first-observation wall clock.
