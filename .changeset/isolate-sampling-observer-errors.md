---
"assistant-cloud": patch
---

fix: preserve successful MCP sampling responses when metrics callbacks throw or reject. Report callback errors without delaying the response or masking model failures.
