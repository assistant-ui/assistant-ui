---
"@assistant-ui/core": patch
"@assistant-ui/react-google-adk": patch
"@assistant-ui/react-a2a": patch
"@assistant-ui/react-langchain": patch
---

send bare base64 images as inline data while preserving URL and relative image references. share base64 classification across adapters, including line-wrapped payloads and formats without a known image signature. additionally, LangChain and LangGraph normalize base64 data URLs through the image MIME resolver, correcting omitted or generic media types and decoding percent-escaped base64 bytes.
