---
"@assistant-ui/core": patch
"@assistant-ui/react-google-adk": patch
"@assistant-ui/react-a2a": patch
"@assistant-ui/react-langchain": patch
---

Send bare base64 images as inline data while preserving URL and relative image references. Share base64 classification across adapters, including line-wrapped payloads and formats without a known image signature. LangChain and LangGraph also normalize base64 data URLs through the image MIME resolver, correcting omitted or generic media types and decoding percent-escaped base64 bytes.
