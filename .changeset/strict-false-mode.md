---
"assistant-stream": patch
"@assistant-ui/react": patch
---

feat: add opt-in `strict: false` mode that reconciles malformed stream input instead of throwing (decoders, encoders, state accumulator); assistant-transport resume runs always decode leniently
