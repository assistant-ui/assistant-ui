---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/react-pi": patch
"@assistant-ui/react-langgraph": patch
"@assistant-ui/react-ag-ui": patch
---

feat: two-lane, placement-aware message queue with steer-by-default mid-run sends

`ExternalThreadQueueAdapter` is reshaped: `enqueue(message, { steer })` splits into
`enqueue(message)` / `steer(message)`, `steer(queueItemId)` becomes
`move(queueItemId, { lane: "steer", insertAfter: null })`, `clear(reason)` is dropped
(queue clear policy is now host-owned), and `steerItems` / `move` / `edit` and
`QueueItemState.parts` are required.
