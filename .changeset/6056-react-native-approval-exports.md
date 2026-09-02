---
"@assistant-ui/react-native": patch
---

feat: re-export the approval display type and its helper

`ToolApprovalDisplay` and `toolApprovalAcceptsText` reach the React Native distribution alongside the approval types it already exports, so a renderer there can tell a question from a permission gate.
