---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

feat: a tool UI can record what the user did on its tool call with `unstable_recordInteraction`, kept on the part as `unstable_interactions` and stored in cloud history; the answer to a human input request is recorded once the runtime accepts it, the local runtime persists records and keeps them out of model input, external stores receive them through `unstable_onRecordToolInteraction`, and readonly threads ignore them
