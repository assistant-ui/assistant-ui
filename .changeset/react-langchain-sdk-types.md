---
"@assistant-ui/react-langchain": patch
---

fix: type-check the langchain message converter against the current `@langchain/langgraph-sdk` (return a single converter `Message`, accept the generative-UI metadata extension, and bind `uiMessagesByParent` through a memoized callback rather than the converter's `metadata` channel). no runtime behavior change.
