---
"@assistant-ui/react-langchain": patch
"@assistant-ui/react-langgraph": patch
---

feat: task subagent transcripts ride on ToolCallMessagePart.messages so MessagePartPrimitive.Messages renders them and thread.tasks lists them; the peer floors move to @langchain/react ^1.0.20 and @langchain/langgraph-sdk ^1.9.20, and react-langgraph follows the sdk floor because it depends on react-langchain
