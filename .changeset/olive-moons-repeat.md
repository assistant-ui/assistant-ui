---
"@assistant-ui/react-ag-ui": patch
---

fix: preserve encrypted-only reasoning records across the AG-UI round trip. Under zero data retention an agent sends a `ReasoningMessage` whose readable `content` is empty and whose payload is entirely in `encryptedValue`, and both the adapter and the core normalizer dropped it: the import guarded on empty text, and a reasoning part with neither text nor summary is removed by `fromThreadMessageLike`. Such a record now rides on `metadata.custom.agui.opaqueReasoning` of the neighbouring message instead of becoming an unrenderable part, and is replayed into the run input at the position it held on the wire.
