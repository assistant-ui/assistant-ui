---
"@assistant-ui/react": patch
"@assistant-ui/react-langchain": patch
"@assistant-ui/react-langgraph": patch
---

`AssistantRuntimeProvider` registers with the devtools, and the LangChain and LangGraph converters print their development warnings, in browser builds where the bundler replaces `process.env.NODE_ENV` without defining a `process` global.
