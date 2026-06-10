---
"@assistant-ui/react-ai-sdk": patch
---

fix: declare assistant-stream as a regular dependency so it is externalized instead of bundled into dist (the bundled copy broke consumers on its transitive secure-json-parse import)
