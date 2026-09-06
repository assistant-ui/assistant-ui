---
"@assistant-ui/react-langchain": patch
"@assistant-ui/react-langgraph": patch
---

fix: keep supported content blocks from continuation chunks

Accumulate reasoning, thinking, files, audio and computer calls across AIMessageChunks by block index, the way `@langchain/core` merges chunk content, so provider signatures survive and a repeated indexed block updates its slot instead of appending a duplicate. Reasoning parts that carry only provider metadata no longer render as empty parts.
