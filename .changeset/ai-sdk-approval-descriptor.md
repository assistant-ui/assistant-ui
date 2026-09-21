---
"@assistant-ui/ai-sdk": patch
---

fix: read select and text approval requests from the AI SDK approval descriptor

an approval request streamed through the AI SDK can now declare its `prompt`, `display`, `allowFreeform` and `options` in the `approvalDescriptor` of its `tool-approval-request` chunk, the one slot that survives `processUIMessageStream` and `validateUIMessages`. the converter reads those fields, plus a recorded `optionId`, `text` and `resolution`, from a descriptor object when the approval itself does not carry them, under the same `onRespondToToolApproval` gate as before. `id`, `approved`, `reason` and `isAutomatic` always come from the AI SDK, and the descriptor stays on the part unchanged.
