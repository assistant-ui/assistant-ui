---
"@assistant-ui/react-ag-ui": patch
---

fix: an assistant message stores the agent state as it stood when its run ended, and a conversation restored from a messages snapshot keeps activity types the runtime does not render as `agui-activity/<type>` data parts
