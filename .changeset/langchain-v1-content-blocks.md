---
"@assistant-ui/react-langchain": patch
"@assistant-ui/react-langgraph": patch
---

fix(react-langchain): convert LangChain standard multimodal content blocks

`convertLangChainContentBlock` only understood the legacy data content blocks
(`mime_type` plus a `source_type` discriminator), so a message carrying the
standard `image`, `video`, `audio`, `file` or `text-plain` blocks that
`@langchain/core` v1 emits lost its payload: an `image` block was dropped
entirely, a `file` block reported `application/octet-stream` because `mimeType`
was never read, and a url-referenced block converted to a file part with no
data. Both vocabularies now resolve through one media block arm, and a block
that carries no representable payload is reported as an unknown part type in
development instead of vanishing.
