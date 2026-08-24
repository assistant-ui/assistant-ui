---
"assistant-cloud": patch
"@assistant-ui/core": patch
"@assistant-ui/cloud-ai-sdk": patch
---

refactor: own the run-report tool call shape in assistant-cloud

the run telemetry primitives (span truncation, MCP result summarization, tool call serialization, provider usage normalization) were copied verbatim into both `@assistant-ui/core`'s cloud history adapter and `@assistant-ui/cloud-ai-sdk`, and the two copies had already drifted on `sampling_calls`. assistant-cloud already declared the wire type both copies were re-declaring, so the builder now lives beside it: `createRunTelemetryToolCall`, `normalizeRunTelemetryUsage`, `truncateRunTelemetryText`, and the `AssistantCloudRunReportToolCall` type it produces. both callers consume those instead of their own copy; the reported payload is unchanged.
