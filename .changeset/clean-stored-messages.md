---
"@assistant-ui/core": patch
---

fix: safely normalize nested message data loaded from local storage

Local-storage history no longer crashes on structurally invalid persisted
content such as `content: [null]` or `attachments: [null]`. Unreadable parts
and attachments are dropped individually instead of discarding the whole
message and its descendants.

Because `append` rewrites the parsed repository, this also changes what a
stored thread looks like after the next message is sent:

- an assistant message with a missing or unusable `status` loads as
  `complete/unknown` instead of being discarded
- a system message with more than one content part keeps its first text part
  instead of being discarded
- malformed attachments and known assistant-only parts found on a user
  message are removed while the message itself is kept
- parts whose `type` this version does not recognize are preserved so a newer
  version's storage is not erased
- tool-call `modelContent` is rebuilt from its valid text and file entries
