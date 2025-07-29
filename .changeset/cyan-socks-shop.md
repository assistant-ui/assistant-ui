---
"@assistant-ui/react": patch
"@assistant-ui/react-ai-sdk": patch
---

Modified the `detach` and `cancelRun` methods to create a standardized `Error` object with a JSON-encoded message and a name of `"AbortError"`, improving consistency in how abort reasons are passed and processed.
