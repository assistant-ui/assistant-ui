---
"@assistant-ui/react-pi": patch
"@assistant-ui/core": patch
---

fix: fetch and encode URL-based image attachments before sending them to Pi; inaccessible or invalid URLs now fail the send
