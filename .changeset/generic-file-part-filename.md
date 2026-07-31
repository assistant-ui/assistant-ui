---
"assistant-stream": patch
"@assistant-ui/react-data-stream": patch
---

fix: carry a file part's filename through to the model message

`GenericFilePart` had no `filename` field, so a `FileMessagePart` or `ImageMessagePart` carrying one arrived at the provider anonymous even though `LanguageModelV2FilePart` accepts a filename. The field is now declared and forwarded by both `toGenericMessages` and the react-data-stream converter, and omitted entirely when the source part has none.
