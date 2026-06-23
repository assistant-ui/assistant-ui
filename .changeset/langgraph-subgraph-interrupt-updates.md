---
"@assistant-ui/react-langgraph": patch
---

fix: surface tool-call messages and interrupts raised inside a subgraph

A subgraph `interrupt()` emits both the tool-call `AIMessage` and the `__interrupt__` payload under a namespaced `updates` event, which the runtime dropped early. The toolkit therefore never rendered the tool UI and `useLangGraphInterruptState` stayed `undefined`. Namespaced `updates` now extract messages and set the interrupt (never clearing an active interrupt from a later subgraph update), so subgraph HITL flows behave like top-level ones.
