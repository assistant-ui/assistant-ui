---
"@assistant-ui/core": patch
"@assistant-ui/react-google-adk": patch
"@assistant-ui/react-a2a": patch
"@assistant-ui/react-langchain": patch
---

send bare base64 images as inline data while preserving URLs and relative image references that are not base64 once whitespace is removed, such as a path with a file extension. a reference made only of base64 characters and whitespace, such as `/uploads/cat`, is sent as inline data. share base64 classification across adapters, including line-wrapped payloads and formats without a known image signature. additionally, LangChain and LangGraph normalize base64 data URLs through the image MIME resolver, correcting omitted or generic media types and decoding percent-escaped base64 bytes.
