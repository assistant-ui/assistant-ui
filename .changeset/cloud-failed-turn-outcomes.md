---
"assistant-cloud": patch
"@assistant-ui/core": patch
"@assistant-ui/ai-sdk": patch
---

report failed and stopped turns with an outcome: an HTTP failure becomes `rate_limited`, `validation_failed`, or `server_error` with its status as `error_code`, a run stopped before its first token reports `aborted`, and a run that ends without output reports `incomplete`
