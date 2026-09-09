---
"assistant-cloud": minor
"@assistant-ui/cloud-ai-sdk": minor
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: align the cloud SDK with Assistant Cloud 0.2

<!-- caret-break: intended -->

- run reports now carry `provider`, `outcome_type` (`aborted`, `disconnected`, `length`, `content_filter`), `error_code`, `message_id`, `first_token_ms`, `duration_ms`, a `finish_reason` per step and `trace_id`, plus `environment`, `release` and `tags` from the `telemetry` config; one `createRunReport` builder in `assistant-cloud` assembles the body for the assistant-ui runtime and for `@assistant-ui/cloud-ai-sdk`, and `provider_type` and `metadata` stay on the wire for older self hosted clouds
- `assistant-cloud/telemetry` (server side): `createAssistantCloudTraceExporter`, `createAssistantCloudSpanProcessor`, `assistantCloudTraceMetadata` and `withAssistantCloudTraceMetadata` send AI SDK GenAI spans to `POST /v1/traces` and hand the trace id to the browser, so a client report and its server spans merge into one run; the OpenTelemetry packages are optional peers of the subpath only
- engagement events: sends, edits, stops, regenerates, copies, branch switches, suggestions, attachments, thread switches, speech, voice and shown errors are batched to `POST /v1/events` without any message content; `telemetry.events: false` opts out
- `cloud.scores.create` for custom scores, and message feedback through `useCloudChat().feedback` next to the assistant-ui `FeedbackAdapter`
- `cloud.files.generatePresignedDownloadUrl` and the object `key` on upload responses
- `CloudAPIError.code` and `details`, including `plan_limit_reached` on a 402
- `@assistant-ui/core` requires `assistant-cloud@^0.2.0`, and its store emits the composer, message and thread events the engagement reporter reads
