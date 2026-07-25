---
"assistant-stream": patch
---

refactor: consolidate on a single wire protocol name (assistant-transport). Remove the unpublished gorp-shaped exports, expose diff tracking as AssistantTransportDeltaTracker and the state operation type as AssistantTransportStateOperation, and keep the published ObjectStream aliases working as deprecated delegates.
