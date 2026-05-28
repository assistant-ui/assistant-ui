---
"@assistant-ui/react": patch
"@assistant-ui/react-ai-sdk": patch
---

fix: AI SDK v6's `useChat` first inserts an assistant placeholder with a client-generated id and then swaps the slot for a new object carrying the server-provided id, which made `BranchPicker` render `2/2` on every streamed assistant turn (#4037). The previous core-side fix (#4040) regressed legitimate branch siblings (#4131) and was reverted; this version moves the cleanup into `useAISDKRuntime`. The adapter compares the previous render's UIMessage ids per position and, only while `chatHelpers.status === "streaming"`, flags the disappearing id as a transient placeholder via the new `unstable_temporaryMessageIds` adapter input. The runtime drops those ids from the in-memory repository before re-linking, so phantom siblings disappear without touching ids that change for user-initiated edits or reloads (status is `"submitted"` / `"ready"` at those moments).
