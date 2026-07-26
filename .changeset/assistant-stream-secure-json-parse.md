---
"assistant-stream": patch
---

fix: parse SSEDecoder and data-stream chunk frames with secure-json-parse, matching the transport and UIMessageStream decoders; a malformed or prototype-pollution frame is now dropped with a warning and the stream continues instead of erroring the whole stream
