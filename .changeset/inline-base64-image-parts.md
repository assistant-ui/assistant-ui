---
"@assistant-ui/core": patch
"@assistant-ui/react-google-adk": patch
"@assistant-ui/react-a2a": patch
"@assistant-ui/react-langchain": patch
---

send bare base64 images as inline data while preserving URLs and relative image references that contain a character outside the base64 alphabet, such as a file extension. an extensionless reference made only of base64 characters, such as `/uploads/cat`, is sent as inline data. share base64 classification across adapters, including line-wrapped payloads and formats without a known image signature. additionally, LangChain and LangGraph normalize base64 data URLs through the image MIME resolver, correcting omitted or generic media types and decoding percent-escaped base64 bytes.
