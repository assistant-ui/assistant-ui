---
"@assistant-ui/react-langchain": patch
"@assistant-ui/react-langgraph": patch
---

fix: preserve file attachment filenames in LangChain blocks

Add filenames at the top level of outbound file blocks so LangChain v0-to-v1 normalization keeps them available to provider translators. Keep the existing metadata field for consumers that read it.
